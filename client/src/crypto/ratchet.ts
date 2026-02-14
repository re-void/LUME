/**
 * Double Ratchet Protocol Implementation
 * На основе Signal Protocol для обеспечения Forward Secrecy и Post-Compromise Security
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { generateExchangeKeyPair, hash, type KeyPair } from './keys';

// ==================== Константы ====================

const MAX_SKIP = 200; // Максимальное количество пропущенных сообщений за один рывок
const MAX_SKIPPED_KEYS = 500; // Максимальный размер хранилища пропущенных ключей

// ==================== Типы ====================

export interface DoubleRatchetSession {
    // Diffie-Hellman ратсчет
    dhSendingKeyPair: KeyPair;
    dhReceivingPublicKey: string | null;

    // Root key и chain keys
    rootKey: Uint8Array;
    sendingChainKey: Uint8Array | null;
    receivingChainKey: Uint8Array | null;

    // Счётчики сообщений
    sendingMessageNumber: number;
    receivingMessageNumber: number;
    previousSendingChainLength: number;

    // Пропущенные ключи сообщений
    skippedMessageKeys: Map<string, Uint8Array>;
}

export interface MessageHeader {
    publicKey: string;        // DH ratchet публичный ключ
    previousChainLength: number;  // N в предыдущем sending chain
    messageNumber: number;    // N в текущем sending chain
}

export interface EncryptedMessage {
    header: MessageHeader;
    ciphertext: string;
    nonce: string;
}

// ==================== KDF функции ====================

/**
 * HKDF-подобная функция для деривации ключей
 * Упрощённая версия с использованием SHA-512
 */
function kdfRk(rootKey: Uint8Array, dhOutput: Uint8Array): { rootKey: Uint8Array; chainKey: Uint8Array } {
    // Конкатенируем root key и DH output
    const input = new Uint8Array(rootKey.length + dhOutput.length);
    input.set(rootKey, 0);
    input.set(dhOutput, rootKey.length);

    // Хешируем для получения нового материала
    const hashOutput = hash(input);

    return {
        rootKey: hashOutput.slice(0, 32),
        chainKey: hashOutput.slice(32, 64),
    };
}

/**
 * KDF для chain key -> message key
 */
function kdfCk(chainKey: Uint8Array): { chainKey: Uint8Array; messageKey: Uint8Array } {
    // Используем разные константы для разных выходов
    const messageKeyInput = new Uint8Array(chainKey.length + 1);
    messageKeyInput.set(chainKey, 0);
    messageKeyInput[chainKey.length] = 0x01;

    const chainKeyInput = new Uint8Array(chainKey.length + 1);
    chainKeyInput.set(chainKey, 0);
    chainKeyInput[chainKey.length] = 0x02;

    return {
        messageKey: hash(messageKeyInput).slice(0, 32),
        chainKey: hash(chainKeyInput).slice(0, 32),
    };
}

/**
 * Выполняет DH обмен ключами
 */
function dh(keyPair: KeyPair, publicKey: string): Uint8Array {
    const secretKeyBytes = decodeBase64(keyPair.secretKey);
    const publicKeyBytes = decodeBase64(publicKey);

    // Используем nacl.box.before для DH
    return nacl.box.before(publicKeyBytes, secretKeyBytes);
}

// ==================== X3DH (Extended Triple Diffie-Hellman) ====================

export interface X3DHBundle {
    identityKey: string;      // Долгосрочный identity key (IK)
    signedPreKey: string;     // Подписанный prekey (SPK)
    signature: string;        // Подпись SPK
    oneTimePreKey?: string;   // Одноразовый prekey (OPK)
}

/**
 * Инициирует X3DH как отправитель
 * Возвращает shared secret и ephemeral key для включения в первое сообщение
 */
export function x3dhInitiate(
    senderIdentityKeyPair: KeyPair,
    recipientBundle: X3DHBundle
): { sharedSecret: Uint8Array; ephemeralPublicKey: string } {
    // Генерируем эфемерный ключ
    const ephemeralKeyPair = generateExchangeKeyPair();

    // DH1: sender identity key, recipient signed prekey
    const dh1 = dh(senderIdentityKeyPair, recipientBundle.signedPreKey);

    // DH2: sender ephemeral key, recipient identity key
    const dh2 = dh(ephemeralKeyPair, recipientBundle.identityKey);

    // DH3: sender ephemeral key, recipient signed prekey
    const dh3 = dh(ephemeralKeyPair, recipientBundle.signedPreKey);

    // DH4: sender ephemeral key, recipient one-time prekey (если есть)
    let dh4: Uint8Array | null = null;
    if (recipientBundle.oneTimePreKey) {
        dh4 = dh(ephemeralKeyPair, recipientBundle.oneTimePreKey);
    }

    // Объединяем все DH результаты
    const totalLength = dh1.length + dh2.length + dh3.length + (dh4?.length || 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    combined.set(dh1, offset); offset += dh1.length;
    combined.set(dh2, offset); offset += dh2.length;
    combined.set(dh3, offset); offset += dh3.length;
    if (dh4) {
        combined.set(dh4, offset);
    }

    // Деривируем shared secret
    const sharedSecret = hash(combined).slice(0, 32);

    return {
        sharedSecret,
        ephemeralPublicKey: ephemeralKeyPair.publicKey,
    };
}

/**
 * Обрабатывает X3DH как получатель
 */
export function x3dhRespond(
    recipientIdentityKeyPair: KeyPair,
    recipientSignedPreKeyPair: KeyPair,
    recipientOneTimePreKeyPair: KeyPair | null,
    senderIdentityKey: string,
    senderEphemeralKey: string
): Uint8Array {
    // DH1: sender identity key, recipient signed prekey
    const dh1 = dh(recipientSignedPreKeyPair, senderIdentityKey);

    // DH2: sender ephemeral key, recipient identity key
    const dh2 = dh(recipientIdentityKeyPair, senderEphemeralKey);

    // DH3: sender ephemeral key, recipient signed prekey
    const dh3 = dh(recipientSignedPreKeyPair, senderEphemeralKey);

    // DH4: sender ephemeral key, recipient one-time prekey
    let dh4: Uint8Array | null = null;
    if (recipientOneTimePreKeyPair) {
        dh4 = dh(recipientOneTimePreKeyPair, senderEphemeralKey);
    }

    // Объединяем
    const totalLength = dh1.length + dh2.length + dh3.length + (dh4?.length || 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    combined.set(dh1, offset); offset += dh1.length;
    combined.set(dh2, offset); offset += dh2.length;
    combined.set(dh3, offset); offset += dh3.length;
    if (dh4) {
        combined.set(dh4, offset);
    }

    return hash(combined).slice(0, 32);
}

// ==================== Double Ratchet ====================

/**
 * Инициализирует сессию как отправитель (Alice)
 */
export function initSenderSession(
    sharedSecret: Uint8Array,
    recipientPublicKey: string
): DoubleRatchetSession {
    const dhKeyPair = generateExchangeKeyPair();
    const dhOutput = dh(dhKeyPair, recipientPublicKey);
    const { rootKey, chainKey } = kdfRk(sharedSecret, dhOutput);

    return {
        dhSendingKeyPair: dhKeyPair,
        dhReceivingPublicKey: recipientPublicKey,
        rootKey,
        sendingChainKey: chainKey,
        receivingChainKey: null,
        sendingMessageNumber: 0,
        receivingMessageNumber: 0,
        previousSendingChainLength: 0,
        skippedMessageKeys: new Map(),
    };
}

/**
 * Инициализирует сессию как получатель (Bob)
 */
export function initReceiverSession(
    sharedSecret: Uint8Array,
    keyPair: KeyPair
): DoubleRatchetSession {
    return {
        dhSendingKeyPair: keyPair,
        dhReceivingPublicKey: null,
        rootKey: sharedSecret,
        sendingChainKey: null,
        receivingChainKey: null,
        sendingMessageNumber: 0,
        receivingMessageNumber: 0,
        previousSendingChainLength: 0,
        skippedMessageKeys: new Map(),
    };
}

/**
 * Выполняет DH ratchet
 */
function dhRatchet(session: DoubleRatchetSession, headerPublicKey: string): void {
    session.previousSendingChainLength = session.sendingMessageNumber;
    session.sendingMessageNumber = 0;
    session.receivingMessageNumber = 0;

    session.dhReceivingPublicKey = headerPublicKey;

    const dhOutput = dh(session.dhSendingKeyPair, headerPublicKey);
    const receiveResult = kdfRk(session.rootKey, dhOutput);
    session.rootKey = receiveResult.rootKey;
    session.receivingChainKey = receiveResult.chainKey;

    session.dhSendingKeyPair = generateExchangeKeyPair();

    const sendDhOutput = dh(session.dhSendingKeyPair, headerPublicKey);
    const sendResult = kdfRk(session.rootKey, sendDhOutput);
    session.rootKey = sendResult.rootKey;
    session.sendingChainKey = sendResult.chainKey;
}

/**
 * Пропускает ключи сообщений (для out-of-order доставки)
 */
function skipMessageKeys(session: DoubleRatchetSession, until: number): void {
    if (!session.receivingChainKey) return;

    if (session.receivingMessageNumber + MAX_SKIP < until) {
        throw new Error('Too many skipped messages');
    }

    while (session.receivingMessageNumber < until) {
        const { chainKey, messageKey } = kdfCk(session.receivingChainKey);
        session.receivingChainKey = chainKey;

        const key = `${session.dhReceivingPublicKey}:${session.receivingMessageNumber}`;
        session.skippedMessageKeys.set(key, messageKey);

        session.receivingMessageNumber++;
    }

    // Evict oldest skipped keys if over capacity
    if (session.skippedMessageKeys.size > MAX_SKIPPED_KEYS) {
        const keysIter = session.skippedMessageKeys.keys();
        while (session.skippedMessageKeys.size > MAX_SKIPPED_KEYS) {
            const oldest = keysIter.next();
            if (oldest.done) break;
            session.skippedMessageKeys.delete(oldest.value);
        }
    }
}

/**
 * Шифрует сообщение
 */
export function ratchetEncrypt(
    session: DoubleRatchetSession,
    plaintext: Uint8Array
): EncryptedMessage {
    if (!session.sendingChainKey) {
        throw new Error('Sending chain not initialized');
    }

    const { chainKey, messageKey } = kdfCk(session.sendingChainKey);
    session.sendingChainKey = chainKey;

    const header: MessageHeader = {
        publicKey: session.dhSendingKeyPair.publicKey,
        previousChainLength: session.previousSendingChainLength,
        messageNumber: session.sendingMessageNumber,
    };

    session.sendingMessageNumber++;

    // Шифруем с message key
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const ciphertext = nacl.secretbox(plaintext, nonce, messageKey);

    return {
        header,
        ciphertext: encodeBase64(ciphertext),
        nonce: encodeBase64(nonce),
    };
}

/**
 * Расшифровывает сообщение
 */
export function ratchetDecrypt(
    session: DoubleRatchetSession,
    message: EncryptedMessage
): Uint8Array | null {
    // Проверяем пропущенные ключи
    const skippedKey = `${message.header.publicKey}:${message.header.messageNumber}`;
    const skippedMessageKey = session.skippedMessageKeys.get(skippedKey);

    if (skippedMessageKey) {
        session.skippedMessageKeys.delete(skippedKey);

        const ciphertext = decodeBase64(message.ciphertext);
        const nonce = decodeBase64(message.nonce);
        return nacl.secretbox.open(ciphertext, nonce, skippedMessageKey);
    }

    // Нужен ли DH ratchet?
    if (message.header.publicKey !== session.dhReceivingPublicKey) {
        // Пропускаем оставшиеся ключи в текущей receiving chain
        if (session.receivingChainKey) {
            skipMessageKeys(session, message.header.previousChainLength);
        }

        // Выполняем DH ratchet
        dhRatchet(session, message.header.publicKey);
    }

    // Пропускаем ключи до нужного номера
    skipMessageKeys(session, message.header.messageNumber);

    if (!session.receivingChainKey) {
        throw new Error('Receiving chain not initialized');
    }

    // Получаем message key
    const { chainKey, messageKey } = kdfCk(session.receivingChainKey);
    session.receivingChainKey = chainKey;
    session.receivingMessageNumber++;

    // Расшифровываем
    const ciphertext = decodeBase64(message.ciphertext);
    const nonce = decodeBase64(message.nonce);
    return nacl.secretbox.open(ciphertext, nonce, messageKey);
}

// ==================== Сериализация ====================

export interface SerializedSession {
    dhSendingKeyPair: KeyPair;
    dhReceivingPublicKey: string | null;
    rootKey: string;
    sendingChainKey: string | null;
    receivingChainKey: string | null;
    sendingMessageNumber: number;
    receivingMessageNumber: number;
    previousSendingChainLength: number;
    skippedMessageKeys: Array<[string, string]>;
}

/**
 * Сериализует сессию для хранения
 */
export function serializeSession(session: DoubleRatchetSession): SerializedSession {
    return {
        dhSendingKeyPair: session.dhSendingKeyPair,
        dhReceivingPublicKey: session.dhReceivingPublicKey,
        rootKey: encodeBase64(session.rootKey),
        sendingChainKey: session.sendingChainKey ? encodeBase64(session.sendingChainKey) : null,
        receivingChainKey: session.receivingChainKey ? encodeBase64(session.receivingChainKey) : null,
        sendingMessageNumber: session.sendingMessageNumber,
        receivingMessageNumber: session.receivingMessageNumber,
        previousSendingChainLength: session.previousSendingChainLength,
        skippedMessageKeys: Array.from(session.skippedMessageKeys.entries()).map(
            ([k, v]) => [k, encodeBase64(v)]
        ),
    };
}

/**
 * Десериализует сессию
 */
export function deserializeSession(data: SerializedSession): DoubleRatchetSession {
    return {
        dhSendingKeyPair: data.dhSendingKeyPair,
        dhReceivingPublicKey: data.dhReceivingPublicKey,
        rootKey: decodeBase64(data.rootKey),
        sendingChainKey: data.sendingChainKey ? decodeBase64(data.sendingChainKey) : null,
        receivingChainKey: data.receivingChainKey ? decodeBase64(data.receivingChainKey) : null,
        sendingMessageNumber: data.sendingMessageNumber,
        receivingMessageNumber: data.receivingMessageNumber,
        previousSendingChainLength: data.previousSendingChainLength,
        skippedMessageKeys: new Map(
            data.skippedMessageKeys.map(([k, v]) => [k, decodeBase64(v)])
        ),
    };
}

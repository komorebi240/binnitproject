package com.company.project.modules.crm.service;

import com.company.project.modules.crm.CrmProperties;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Encryption of a company's CRM data with keys that belong to that company. One master key (an environment secret) is
 * never used directly: each company gets its own AES key and its own HMAC key, derived from the master with HKDF
 * (RFC 5869) using the company id as context. A ciphertext is also bound to its company (AES-GCM associated data), so
 * rows copied between companies in the database do not decrypt.
 *
 * <p>Honest limits: whoever holds the master key can derive every company's keys, so this protects against a stolen
 * database or backup and against anyone without server access - not against the operator of the server. Keeping the
 * key out of the database and out of the source code, and restricting who can read the server's environment, is what
 * makes it effective.
 */
@Component
public class CrmCrypto {

    private static final String CIPHER = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final int KEY_BYTES = 32;
    private static final String HMAC = "HmacSHA256";

    private final byte[] masterKey;
    private final SecureRandom random = new SecureRandom();
    private final ConcurrentMap<Long, SecretKeySpec> dataKeys = new ConcurrentHashMap<>();
    private final ConcurrentMap<Long, SecretKeySpec> indexKeys = new ConcurrentHashMap<>();

    public CrmCrypto(CrmProperties properties) {
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(properties.dataKey());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("app.crm.data-key must be Base64 of 32 random bytes", e);
        }
        if (decoded.length != KEY_BYTES) {
            throw new IllegalStateException("app.crm.data-key must be 32 bytes (got " + decoded.length + ")");
        }
        this.masterKey = decoded;
    }

    /** Encrypts {@code plaintext} for {@code companyId}; the result is Base64 of IV followed by ciphertext and tag. */
    public String encrypt(Long companyId, String plaintext) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(CIPHER);
            cipher.init(Cipher.ENCRYPT_MODE, dataKey(companyId), new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD(associatedData(companyId));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not encrypt CRM data", e);
        }
    }

    public String decrypt(Long companyId, String encoded) {
        try {
            byte[] combined = Base64.getDecoder().decode(encoded);
            byte[] iv = Arrays.copyOfRange(combined, 0, IV_BYTES);
            byte[] ciphertext = Arrays.copyOfRange(combined, IV_BYTES, combined.length);
            Cipher cipher = Cipher.getInstance(CIPHER);
            cipher.init(Cipher.DECRYPT_MODE, dataKey(companyId), new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD(associatedData(companyId));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("Could not decrypt CRM data", e);
        }
    }

    /**
     * A keyed hash of an already-normalised value (hex, 64 characters): equal values of the same company give equal
     * hashes, so duplicates can be found without decrypting; another company's hash of the same value is different.
     */
    public String blindIndex(Long companyId, String normalizedValue) {
        try {
            Mac mac = Mac.getInstance(HMAC);
            mac.init(indexKey(companyId));
            return HexFormat.of().formatHex(mac.doFinal(normalizedValue.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not compute CRM index", e);
        }
    }

    private SecretKeySpec dataKey(Long companyId) {
        return dataKeys.computeIfAbsent(companyId, id -> new SecretKeySpec(derive("orbit-crm-data|company|" + id), "AES"));
    }

    private SecretKeySpec indexKey(Long companyId) {
        return indexKeys.computeIfAbsent(companyId, id -> new SecretKeySpec(derive("orbit-crm-index|company|" + id), HMAC));
    }

    private byte[] derive(String context) {
        return hkdf(masterKey, new byte[0], context.getBytes(StandardCharsets.UTF_8), KEY_BYTES);
    }

    private static byte[] associatedData(Long companyId) {
        return ("orbit-crm|company|" + companyId).getBytes(StandardCharsets.UTF_8);
    }

    /** HKDF-SHA256 (RFC 5869): extract with {@code salt}, expand with {@code info} to {@code length} bytes. */
    static byte[] hkdf(byte[] inputKeyMaterial, byte[] salt, byte[] info, int length) {
        try {
            Mac mac = Mac.getInstance(HMAC);
            // An empty salt means "a string of zeros as long as the hash", as the RFC says.
            mac.init(new SecretKeySpec(salt.length == 0 ? new byte[mac.getMacLength()] : salt, HMAC));
            byte[] pseudoRandomKey = mac.doFinal(inputKeyMaterial);

            mac.init(new SecretKeySpec(pseudoRandomKey, HMAC));
            byte[] output = new byte[length];
            byte[] previous = new byte[0];
            int produced = 0;
            for (int counter = 1; produced < length; counter++) {
                mac.update(previous);
                mac.update(info);
                mac.update((byte) counter);
                previous = mac.doFinal();
                int take = Math.min(previous.length, length - produced);
                System.arraycopy(previous, 0, output, produced, take);
                produced += take;
            }
            return output;
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Key derivation failed", e);
        }
    }
}

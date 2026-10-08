package com.company.project.unit.modules.crm;

import com.company.project.modules.crm.CrmProperties;
import com.company.project.modules.crm.service.CrmCrypto;
import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** A company's customer data is readable only with that company's key. */
class CrmCryptoTest {

    private static final String KEY = Base64.getEncoder().encodeToString("0123456789abcdef0123456789abcdef".getBytes());
    private static final String OTHER_KEY = Base64.getEncoder().encodeToString("fedcba9876543210fedcba9876543210".getBytes());

    private static CrmCrypto crypto(String key) {
        return new CrmCrypto(new CrmProperties(key, 10_000, 5_242_880, 50_000, 50, 20_000));
    }

    @Test
    void whatIsEncryptedForACompanyDecryptsForThatCompany() {
        CrmCrypto crypto = crypto(KEY);
        String encrypted = crypto.encrypt(1L, "{\"1\":\"Nguyễn Văn A\"}");

        assertThat(encrypted).doesNotContain("Nguy");
        assertThat(crypto.decrypt(1L, encrypted)).isEqualTo("{\"1\":\"Nguyễn Văn A\"}");
    }

    @Test
    void theSameTextEncryptsDifferentlyEachTime() {
        CrmCrypto crypto = crypto(KEY);
        assertThat(crypto.encrypt(1L, "same")).isNotEqualTo(crypto.encrypt(1L, "same"));
    }

    @Test
    void anotherCompanyCannotReadIt() {
        CrmCrypto crypto = crypto(KEY);
        String encrypted = crypto.encrypt(1L, "secret");

        assertThatThrownBy(() -> crypto.decrypt(2L, encrypted)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void anotherMasterKeyCannotReadIt() {
        String encrypted = crypto(KEY).encrypt(1L, "secret");

        assertThatThrownBy(() -> crypto(OTHER_KEY).decrypt(1L, encrypted)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void tamperedDataIsRefused() {
        CrmCrypto crypto = crypto(KEY);
        byte[] bytes = Base64.getDecoder().decode(crypto.encrypt(1L, "secret"));
        bytes[bytes.length - 1] ^= 1;

        assertThatThrownBy(() -> crypto.decrypt(1L, Base64.getEncoder().encodeToString(bytes))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void theBlindIndexIsStableWithinACompanyAndDifferentBetweenCompanies() {
        CrmCrypto crypto = crypto(KEY);
        String a = crypto.blindIndex(1L, "email:an@example.com");

        assertThat(a).hasSize(64).isEqualTo(crypto.blindIndex(1L, "email:an@example.com"));
        assertThat(a).isNotEqualTo(crypto.blindIndex(2L, "email:an@example.com"));
        assertThat(a).isNotEqualTo(crypto.blindIndex(1L, "email:other@example.com"));
        assertThat(a).isNotEqualTo(crypto(OTHER_KEY).blindIndex(1L, "email:an@example.com"));
        assertThat(a).doesNotContain("example");
    }

    @Test
    void theMasterKeyMustBe32BytesOfBase64() {
        assertThatThrownBy(() -> crypto("not base64!")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> crypto(Base64.getEncoder().encodeToString(new byte[16]))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void hkdfMatchesTheRfc5869TestVector() throws Exception {
        var method = CrmCrypto.class.getDeclaredMethod("hkdf", byte[].class, byte[].class, byte[].class, int.class);
        method.setAccessible(true);
        HexFormat hex = HexFormat.of();
        byte[] okm = (byte[]) method.invoke(null,
                hex.parseHex("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b"),
                hex.parseHex("000102030405060708090a0b0c"),
                hex.parseHex("f0f1f2f3f4f5f6f7f8f9"),
                42);

        assertThat(hex.formatHex(okm)).isEqualTo("3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865");
    }
}

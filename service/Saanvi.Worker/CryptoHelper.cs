using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace Saanvi.Worker
{
    public static class CryptoHelper
    {
        private static byte[] GetSecretKey(string secret)
        {
            if (string.IsNullOrEmpty(secret))
            {
                secret = "default_fallback_secret_do_not_use_in_prod";
            }

            using (var sha256 = SHA256.Create())
            {
                return sha256.ComputeHash(Encoding.UTF8.GetBytes(secret));
            }
        }

        public static string Decrypt(string encryptedTextWithIv, string sessionSecret)
        {
            if (string.IsNullOrEmpty(encryptedTextWithIv)) return null;

            var parts = encryptedTextWithIv.Split(':');
            if (parts.Length != 2) throw new ArgumentException("Invalid encrypted payload format.");

            byte[] iv = ConvertHexStringToByteArray(parts[0]);
            byte[] cipherText = ConvertHexStringToByteArray(parts[1]);
            byte[] key = GetSecretKey(sessionSecret);

            using (var aesAlg = Aes.Create())
            {
                aesAlg.Key = key;
                aesAlg.IV = iv;
                aesAlg.Mode = CipherMode.CBC;
                aesAlg.Padding = PaddingMode.PKCS7;

                using (var decryptor = aesAlg.CreateDecryptor(aesAlg.Key, aesAlg.IV))
                using (var msDecrypt = new MemoryStream(cipherText))
                using (var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read))
                using (var srDecrypt = new StreamReader(csDecrypt))
                {
                    return srDecrypt.ReadToEnd();
                }
            }
        }

        private static byte[] ConvertHexStringToByteArray(string hex)
        {
            if (hex.Length % 2 != 0)
                throw new ArgumentException($"The hex string cannot have an odd number of digits: {hex}");

            byte[] data = new byte[hex.Length / 2];
            for (int index = 0; index < data.Length; index++)
            {
                string byteValue = hex.Substring(index * 2, 2);
                data[index] = byte.Parse(byteValue, System.Globalization.NumberStyles.HexNumber, System.Globalization.CultureInfo.InvariantCulture);
            }

            return data;
        }
    }
}

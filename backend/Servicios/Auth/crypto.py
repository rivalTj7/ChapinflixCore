from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
import base64
import os
from config import get_settings

settings = get_settings()

class AESCipher:
    def __init__(self):
        self.key = settings.aes_key.encode()[:32].ljust(32, b'\0')  # Ensure 32 bytes for AES-256
    
    def encrypt(self, plain_text: str) -> str:
        """Encrypt data using AES"""
        iv = os.urandom(16)
        cipher = Cipher(
            algorithms.AES(self.key),
            modes.CBC(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        
        # Pad the plain text
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plain_text.encode()) + padder.finalize()
        
        # Encrypt
        encrypted = encryptor.update(padded_data) + encryptor.finalize()
        
        # Return IV + encrypted data as base64
        return base64.b64encode(iv + encrypted).decode('utf-8')
    
    def decrypt(self, encrypted_text: str) -> str:
        """Decrypt AES encrypted data"""
        encrypted_data = base64.b64decode(encrypted_text)
        
        # Extract IV and encrypted content
        iv = encrypted_data[:16]
        encrypted = encrypted_data[16:]
        
        cipher = Cipher(
            algorithms.AES(self.key),
            modes.CBC(iv),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        # Decrypt
        decrypted_padded = decryptor.update(encrypted) + decryptor.finalize()
        
        # Unpad
        unpadder = padding.PKCS7(128).unpadder()
        decrypted = unpadder.update(decrypted_padded) + unpadder.finalize()
        
        return decrypted.decode('utf-8')

aes_cipher = AESCipher()
defmodule RaccoonBridges.CredentialEncryption do
  @moduledoc """
  AES-256-GCM encryption for bridge credentials.

  Uses the BRIDGE_ENCRYPTION_KEY environment variable (base64-encoded 32-byte key).
  """

  @aad "RaccoonBridges.CredentialEncryption"

  @doc """
  Encrypt a plaintext credential string.
  Returns a binary containing the IV, ciphertext, and auth tag.
  """
  @spec encrypt(String.t()) :: {:ok, binary()} | {:error, term()}
  def encrypt(plaintext) when is_binary(plaintext) do
    key = encryption_key()
    iv = :crypto.strong_rand_bytes(12)

    {ciphertext, tag} =
      :crypto.crypto_one_time_aead(:aes_256_gcm, key, iv, plaintext, @aad, true)

    # Format: <<iv::12 bytes, tag::16 bytes, ciphertext::rest>>
    {:ok, iv <> tag <> ciphertext}
  end

  @doc """
  Decrypt a binary produced by `encrypt/1`.
  Returns the original plaintext credential string.
  """
  @spec decrypt(binary()) :: {:ok, String.t()} | {:error, term()}
  def decrypt(<<iv::binary-12, tag::binary-16, ciphertext::binary>>) do
    key = encryption_key()

    case :crypto.crypto_one_time_aead(:aes_256_gcm, key, iv, ciphertext, @aad, tag, false) do
      :error -> {:error, :decryption_failed}
      plaintext -> {:ok, plaintext}
    end
  end

  def decrypt(_), do: {:error, :invalid_encrypted_data}

  defp encryption_key do
    Application.fetch_env!(:raccoon_bridges, :bridge_encryption_key)
    |> Base.decode64!()
  end
end

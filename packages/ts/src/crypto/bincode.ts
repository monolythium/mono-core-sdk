export class BincodeWriter {
  #chunks: number[] = [];

  u8(value: number): void {
    this.#int(value, 1);
  }

  u16(value: number): void {
    this.#int(value, 2);
  }

  u32(value: number): void {
    this.#int(value, 4);
  }

  u64(value: bigint | number): void {
    this.#big(value, 8);
  }

  u128(value: bigint | number): void {
    this.#big(value, 16);
  }

  enumVariant(value: number): void {
    this.u32(value);
  }

  rawBytes(bytes: Uint8Array): void {
    for (const b of bytes) this.#chunks.push(b);
  }

  bytes(bytes: Uint8Array): void {
    this.u64(BigInt(bytes.length));
    this.rawBytes(bytes);
  }

  optionBytes(bytes: Uint8Array | null): void {
    if (bytes === null) {
      this.u8(0);
      return;
    }
    this.u8(1);
    this.rawBytes(bytes);
  }

  toBytes(): Uint8Array {
    return Uint8Array.from(this.#chunks);
  }

  #int(value: number, bytes: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value >= 2 ** (bytes * 8)) {
      throw new Error(`integer out of u${bytes * 8} range`);
    }
    for (let i = 0; i < bytes; i++) {
      this.#chunks.push((value >> (8 * i)) & 0xff);
    }
  }

  #big(value: bigint | number, bytes: number): void {
    let v = typeof value === "bigint" ? value : BigInt(value);
    if (v < 0n || v >= (1n << BigInt(bytes * 8))) {
      throw new Error(`integer out of u${bytes * 8} range`);
    }
    for (let i = 0; i < bytes; i++) {
      this.#chunks.push(Number(v & 0xffn));
      v >>= 8n;
    }
  }
}

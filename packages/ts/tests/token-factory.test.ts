import { describe, expect, it } from "vitest";
import {
  PRECOMPILE_ADDRESSES,
  TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI,
  TOKEN_FACTORY_FLAGS,
  TOKEN_FACTORY_MAX_CREATOR_FEE_BPS,
  TOKEN_FACTORY_MAX_DECIMALS,
  TOKEN_FACTORY_NAME_MAX_BYTES,
  TOKEN_FACTORY_SELECTORS,
  TOKEN_FACTORY_SIGS,
  TOKEN_FACTORY_SYMBOL_MAX_BYTES,
  TokenFactoryError,
  decodeTokenFactoryTokenId,
  deriveTokenFactoryTokenId,
  encodeCreateFixedSupplyMrc20Calldata,
  encodeCreateTokenCalldata,
  encodeTokenFactoryAllowanceCalldata,
  encodeTokenFactoryApproveCalldata,
  encodeTokenFactoryBalanceOfCalldata,
  encodeTokenFactoryBurnCalldata,
  encodeTokenFactoryDecreaseAllowanceCalldata,
  encodeTokenFactoryDestroyCalldata,
  encodeTokenFactoryIncreaseAllowanceCalldata,
  encodeTokenFactoryMetadataCalldata,
  encodeTokenFactoryMintCalldata,
  encodeTokenFactorySetPausedCalldata,
  encodeTokenFactoryTotalSupplyCalldata,
  encodeTokenFactoryTransferCalldata,
  encodeTokenFactoryTransferFromCalldata,
  encodeTokenFactoryTransferOwnershipCalldata,
  tokenFactoryAddressHex,
  validateTokenFactoryFlags,
} from "../src/index.js";

const TOKEN = `0x${"22".repeat(32)}`;
const OWNER = `0x${"11".repeat(20)}`;
const RECIPIENT = `0x${"33".repeat(20)}`;
const SPENDER = `0x${"44".repeat(20)}`;

describe("token factory precompile helpers", () => {
  it("exports the canonical address, deposit, limits, and selectors", () => {
    expect(PRECOMPILE_ADDRESSES.TOKEN_FACTORY).toBe("0x0000000000000000000000000000000000001000");
    expect(tokenFactoryAddressHex()).toBe("0x0000000000000000000000000000000000001000");
    expect(TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI).toBe(3_000_000_000_000_000n);
    expect(TOKEN_FACTORY_NAME_MAX_BYTES).toBe(256);
    expect(TOKEN_FACTORY_SYMBOL_MAX_BYTES).toBe(256);
    expect(TOKEN_FACTORY_MAX_DECIMALS).toBe(30);
    expect(TOKEN_FACTORY_MAX_CREATOR_FEE_BPS).toBe(10_000);
    expect(TOKEN_FACTORY_SIGS.createToken).toBe(
      "createToken(string,string,uint8,uint256,uint256,uint32,uint16)",
    );
    expect(TOKEN_FACTORY_SELECTORS).toEqual({
      createToken: "0x86538be6",
      transfer: "0x3feb1bd8",
      transferFrom: "0x500d2f6d",
      approve: "0xbf1ed1eb",
      increaseAllowance: "0x85aad644",
      decreaseAllowance: "0x80a98026",
      balanceOf: "0xc2038236",
      allowance: "0xe88a3178",
      totalSupply: "0xb524abcf",
      metadata: "0x7122ba06",
      mint: "0x7ed9db59",
      burn: "0x7a408454",
      setPaused: "0x8ea9db9e",
      transferOwnership: "0xef5d6bbb",
      destroyToken: "0xeebfb72f",
    });
  });

  it("derives token ids from creator and nonce exactly like mono-core", () => {
    expect(deriveTokenFactoryTokenId(OWNER, 7)).toBe(
      "0x292c1c3bf8740a122c32639a4065f14f4b43487eb329202c683b2ad71f00c16c",
    );
  });

  it("encodes createToken ABI v2 calldata", () => {
    const calldata = encodeCreateFixedSupplyMrc20Calldata({
      name: "Dice Token",
      symbol: "DICE",
      decimals: 18,
      supply: 1_000_000_000_000_000_000_000_000n,
      burnable: true,
    });

    expect(calldata).toBe(
      [
        "0x86538be6",
        "00000000000000000000000000000000000000000000000000000000000000e0",
        "0000000000000000000000000000000000000000000000000000000000000120",
        "0000000000000000000000000000000000000000000000000000000000000012",
        "00000000000000000000000000000000000000000000d3c21bcecceda1000000",
        "00000000000000000000000000000000000000000000d3c21bcecceda1000000",
        "000000000000000000000000000000000000000000000000000000000000000a",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "000000000000000000000000000000000000000000000000000000000000000a",
        "4469636520546f6b656e00000000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000000000000000000000000004",
        "4449434500000000000000000000000000000000000000000000000000000000",
      ].join(""),
    );
  });

  it("encodes the read/write calldata helpers", () => {
    expect(encodeTokenFactoryTransferCalldata(TOKEN, RECIPIENT, 5)).toBe(
      `0x3feb1bd8${"22".repeat(32)}000000000000000000000000${"33".repeat(20)}0000000000000000000000000000000000000000000000000000000000000005`,
    );
    expect(encodeTokenFactoryTransferFromCalldata(TOKEN, OWNER, RECIPIENT, 5)).toBe(
      `0x500d2f6d${"22".repeat(32)}000000000000000000000000${"11".repeat(20)}000000000000000000000000${"33".repeat(20)}0000000000000000000000000000000000000000000000000000000000000005`,
    );
    expect(encodeTokenFactoryApproveCalldata(TOKEN, SPENDER, 9)).toBe(
      `0xbf1ed1eb${"22".repeat(32)}000000000000000000000000${"44".repeat(20)}0000000000000000000000000000000000000000000000000000000000000009`,
    );
    expect(encodeTokenFactoryIncreaseAllowanceCalldata(TOKEN, SPENDER, 1)).toBe(
      `0x85aad644${"22".repeat(32)}000000000000000000000000${"44".repeat(20)}0000000000000000000000000000000000000000000000000000000000000001`,
    );
    expect(encodeTokenFactoryDecreaseAllowanceCalldata(TOKEN, SPENDER, 1)).toBe(
      `0x80a98026${"22".repeat(32)}000000000000000000000000${"44".repeat(20)}0000000000000000000000000000000000000000000000000000000000000001`,
    );
    expect(encodeTokenFactoryBalanceOfCalldata(TOKEN, OWNER)).toBe(
      `0xc2038236${"22".repeat(32)}000000000000000000000000${"11".repeat(20)}`,
    );
    expect(encodeTokenFactoryAllowanceCalldata(TOKEN, OWNER, SPENDER)).toBe(
      `0xe88a3178${"22".repeat(32)}000000000000000000000000${"11".repeat(20)}000000000000000000000000${"44".repeat(20)}`,
    );
    expect(encodeTokenFactoryTotalSupplyCalldata(TOKEN)).toBe(`0xb524abcf${"22".repeat(32)}`);
    expect(encodeTokenFactoryMetadataCalldata(TOKEN)).toBe(`0x7122ba06${"22".repeat(32)}`);
    expect(encodeTokenFactoryMintCalldata(TOKEN, RECIPIENT, 2)).toBe(
      `0x7ed9db59${"22".repeat(32)}000000000000000000000000${"33".repeat(20)}0000000000000000000000000000000000000000000000000000000000000002`,
    );
    expect(encodeTokenFactoryBurnCalldata(TOKEN, 2)).toBe(
      `0x7a408454${"22".repeat(32)}0000000000000000000000000000000000000000000000000000000000000002`,
    );
    expect(encodeTokenFactorySetPausedCalldata(TOKEN, true)).toBe(
      `0x8ea9db9e${"22".repeat(32)}0000000000000000000000000000000000000000000000000000000000000001`,
    );
    expect(encodeTokenFactoryTransferOwnershipCalldata(TOKEN, RECIPIENT)).toBe(
      `0xef5d6bbb${"22".repeat(32)}000000000000000000000000${"33".repeat(20)}`,
    );
    expect(encodeTokenFactoryDestroyCalldata(TOKEN)).toBe(`0xeebfb72f${"22".repeat(32)}`);
  });

  it("validates flags and user-facing creation inputs before submit", () => {
    expect(() =>
      validateTokenFactoryFlags(TOKEN_FACTORY_FLAGS.MINTABLE | TOKEN_FACTORY_FLAGS.FIXED_SUPPLY),
    ).toThrow(/mutually exclusive/);
    expect(() => validateTokenFactoryFlags(0, 1)).toThrow(/CREATOR_FEE_OPT_IN/);
    expect(() => validateTokenFactoryFlags(TOKEN_FACTORY_FLAGS.CREATOR_FEE_OPT_IN, 0)).toThrow(
      /non-zero/,
    );
    expect(() =>
      encodeCreateTokenCalldata({
        name: "",
        symbol: "EMPTY",
        decimals: 18,
        initialSupply: 0,
        maxSupply: 0,
      }),
    ).toThrow(TokenFactoryError);
    expect(() =>
      encodeCreateTokenCalldata({
        name: "Too Many Decimals",
        symbol: "TMD",
        decimals: 31,
        initialSupply: 0,
        maxSupply: 0,
      }),
    ).toThrow(/decimals/);
  });

  it("decodes bytes32 token id returns", () => {
    expect(decodeTokenFactoryTokenId(TOKEN)).toBe(TOKEN);
    expect(() => decodeTokenFactoryTokenId("0x1234")).toThrow(/32 bytes/);
  });
});

/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/signal_clash_match.json`.
 */
export type SignalClashMatch = {
  "address": "EBVEm8hADVP2dmftFE3FWcdMjg7MWpfk7ssxeNAiawYQ",
  "metadata": {
    "name": "signalClashMatch",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createMatch",
      "docs": [
        "L1: create the per-game match-state PDA."
      ],
      "discriminator": [
        107,
        2,
        184,
        145,
        70,
        142,
        17,
        165
      ],
      "accounts": [
        {
          "name": "matchState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "string"
        },
        {
          "name": "totalRounds",
          "type": "u8"
        }
      ]
    },
    {
      "name": "delegate",
      "docs": [
        "L1: delegate the match-state PDA to the ephemeral rollup."
      ],
      "discriminator": [
        90,
        147,
        75,
        178,
        85,
        88,
        4,
        137
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "bufferMatchState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "matchState"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                195,
                215,
                170,
                133,
                163,
                6,
                49,
                139,
                201,
                151,
                98,
                83,
                14,
                164,
                209,
                28,
                232,
                73,
                163,
                10,
                45,
                19,
                145,
                10,
                11,
                39,
                66,
                46,
                12,
                180,
                128,
                205
              ]
            }
          }
        },
        {
          "name": "delegationRecordMatchState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "matchState"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataMatchState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "matchState"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "matchState",
          "writable": true
        },
        {
          "name": "ownerProgram",
          "address": "EBVEm8hADVP2dmftFE3FWcdMjg7MWpfk7ssxeNAiawYQ"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "string"
        }
      ]
    },
    {
      "name": "finishAndUndelegate",
      "docs": [
        "ER: finalize — commit the final score to L1 and undelegate the PDA."
      ],
      "discriminator": [
        229,
        48,
        206,
        121,
        227,
        31,
        245,
        36
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "string"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "resolveRound",
      "docs": [
        "ER: resolve the round with the off-chain-computed score delta + streak."
      ],
      "discriminator": [
        165,
        114,
        237,
        158,
        1,
        36,
        70,
        254
      ],
      "accounts": [
        {
          "name": "matchState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "string"
        },
        {
          "name": "scoreDelta",
          "type": "i64"
        },
        {
          "name": "newStreak",
          "type": "u8"
        }
      ]
    },
    {
      "name": "submitPrediction",
      "docs": [
        "ER: lock a prediction for the current round."
      ],
      "discriminator": [
        193,
        113,
        41,
        36,
        160,
        60,
        247,
        55
      ],
      "accounts": [
        {
          "name": "matchState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "string"
        },
        {
          "name": "direction",
          "type": "u8"
        },
        {
          "name": "confidence",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "matchState",
      "discriminator": [
        250,
        209,
        137,
        70,
        235,
        96,
        121,
        216
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "finished",
      "msg": "match already finished"
    },
    {
      "code": 6001,
      "name": "overflow",
      "msg": "arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "matchState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "score",
            "type": "i64"
          },
          {
            "name": "streak",
            "type": "u8"
          },
          {
            "name": "round",
            "type": "u8"
          },
          {
            "name": "totalRounds",
            "type": "u8"
          },
          {
            "name": "pendingDir",
            "type": "u8"
          },
          {
            "name": "pendingConf",
            "type": "u8"
          },
          {
            "name": "finished",
            "type": "bool"
          }
        ]
      }
    }
  ]
};

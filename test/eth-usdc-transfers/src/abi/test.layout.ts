export const LAYOUT_JSON = {
    "storage": [
        {
            "label": "x",
            "offset": 0,
            "slot": "0",
            "type": "t_uint256"
        },
        {
            "label": "y",
            "offset": 0,
            "slot": "1",
            "type": "t_uint256"
        },
        {
            "label": "s",
            "offset": 0,
            "slot": "2",
            "type": "t_struct(S)13_storage"
        },
        {
            "label": "addr",
            "offset": 0,
            "slot": "6",
            "type": "t_address"
        },
        {
            "label": "map",
            "offset": 0,
            "slot": "7",
            "type": "t_mapping(t_enum(Enum)21,t_mapping(t_address,t_bool))"
        },
        {
            "label": "array",
            "offset": 0,
            "slot": "8",
            "type": "t_array(t_string_storage)dyn_storage"
        },
        {
            "label": "s1",
            "offset": 0,
            "slot": "9",
            "type": "t_string_storage"
        },
        {
            "label": "b1",
            "offset": 0,
            "slot": "10",
            "type": "t_bytes_storage"
        },
        {
            "label": "b2",
            "offset": 0,
            "slot": "11",
            "type": "t_bytes30"
        },
        {
            "label": "b3",
            "offset": 30,
            "slot": "11",
            "type": "t_bytes2"
        },
        {
            "label": "ses",
            "offset": 0,
            "slot": "12",
            "type": "t_array(t_struct(S)13_storage)2_storage"
        },
        {
            "label": "mapa",
            "offset": 0,
            "slot": "20",
            "type": "t_mapping(t_contract(A)59,t_bool)"
        }
    ],
    "types": {
        "t_address": {
            "encoding": "inplace",
            "label": "address",
            "numberOfBytes": "20"
        },
        "t_array(t_string_storage)dyn_storage": {
            "encoding": "dynamic_array",
            "label": "string[]",
            "numberOfBytes": "32",
            "base": "t_string_storage"
        },
        "t_array(t_struct(S)13_storage)2_storage": {
            "encoding": "inplace",
            "label": "struct A.S[2]",
            "numberOfBytes": "256",
            "base": "t_struct(S)13_storage"
        },
        "t_array(t_uint256)2_storage": {
            "encoding": "inplace",
            "label": "uint256[2]",
            "numberOfBytes": "64",
            "base": "t_uint256"
        },
        "t_array(t_uint256)dyn_storage": {
            "encoding": "dynamic_array",
            "label": "uint256[]",
            "numberOfBytes": "32",
            "base": "t_uint256"
        },
        "t_bool": {
            "encoding": "inplace",
            "label": "bool",
            "numberOfBytes": "1"
        },
        "t_bytes2": {
            "encoding": "inplace",
            "label": "bytes2",
            "numberOfBytes": "2"
        },
        "t_bytes30": {
            "encoding": "inplace",
            "label": "bytes30",
            "numberOfBytes": "30"
        },
        "t_bytes_storage": {
            "encoding": "bytes",
            "label": "bytes",
            "numberOfBytes": "32"
        },
        "t_contract(A)59": {
            "encoding": "inplace",
            "label": "contract A",
            "numberOfBytes": "20"
        },
        "t_enum(Enum)21": {
            "encoding": "inplace",
            "label": "enum A.Enum",
            "numberOfBytes": "1"
        },
        "t_mapping(t_address,t_bool)": {
            "encoding": "mapping",
            "label": "mapping(address => bool)",
            "numberOfBytes": "32",
            "key": "t_address",
            "value": "t_bool"
        },
        "t_mapping(t_contract(A)59,t_bool)": {
            "encoding": "mapping",
            "label": "mapping(contract A => bool)",
            "numberOfBytes": "32",
            "key": "t_contract(A)59",
            "value": "t_bool"
        },
        "t_mapping(t_enum(Enum)21,t_mapping(t_address,t_bool))": {
            "encoding": "mapping",
            "label": "mapping(enum A.Enum => mapping(address => bool))",
            "numberOfBytes": "32",
            "key": "t_enum(Enum)21",
            "value": "t_mapping(t_address,t_bool)"
        },
        "t_string_storage": {
            "encoding": "bytes",
            "label": "string",
            "numberOfBytes": "32"
        },
        "t_struct(S)13_storage": {
            "encoding": "inplace",
            "label": "struct A.S",
            "numberOfBytes": "128",
            "members": [
                {
                    "label": "a",
                    "offset": 0,
                    "slot": "0",
                    "type": "t_uint64"
                },
                {
                    "label": "b",
                    "offset": 8,
                    "slot": "0",
                    "type": "t_uint128"
                },
                {
                    "label": "staticArray",
                    "offset": 0,
                    "slot": "1",
                    "type": "t_array(t_uint256)2_storage"
                },
                {
                    "label": "dynArray",
                    "offset": 0,
                    "slot": "3",
                    "type": "t_array(t_uint256)dyn_storage"
                }
            ]
        },
        "t_uint128": {
            "encoding": "inplace",
            "label": "uint128",
            "numberOfBytes": "16"
        },
        "t_uint256": {
            "encoding": "inplace",
            "label": "uint256",
            "numberOfBytes": "32"
        },
        "t_uint64": {
            "encoding": "inplace",
            "label": "uint64",
            "numberOfBytes": "8"
        }
    }
}

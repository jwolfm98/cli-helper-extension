#ifndef CLI_ARGS_H
#define CLI_ARGS_H

#include <stddef.h>

/*
 * Type macros allow developers to override the default types for portability.
 */

#ifndef CLIPAR_BOOL
  #include <stdbool.h>
  #define CLIPAR_BOOL bool
#endif

#ifndef CLIPAR_CHAR
  #define CLIPAR_CHAR char
#endif

#ifndef CLIPAR_INT
  #define CLIPAR_INT int
#endif

#ifndef CLIPAR_SIZE_T
  #define CLIPAR_SIZE_T size_t
#endif

#ifndef CLIPAR_UINT
  #define CLIPAR_UINT unsigned int
#endif

#ifndef CLIPAR_UINT32
  #include <stdint.h>
  #define CLIPAR_UINT32 uint32_t
#endif

#ifndef CLIPAR_UINT64
  #include <stdint.h>
  #define CLIPAR_UINT64 uint64_t
#endif

#ifndef CLIPAR_FLOAT
  #define CLIPAR_FLOAT float
#endif

#ifndef CLIPAR_ULONG
  #define CLIPAR_ULONG unsigned long
#endif

/**
 * @file cli_args.h
 * @brief Declarations for CLI argument parsing functions.
 *
 * This header provides a suite of functions for parsing and validating
 * command-line arguments. The functions cover unsigned integers (32-bit and 64-bit),
 * signed integers, string options, IPv4 addresses (with and without netmask),
 * booleans, floating point numbers, hexadecimal values, and custom validator callbacks.
 *
 * Developers may override the default type definitions by defining the macros
 * (e.g., CLIPAR_BOOL, CLIPAR_INT, etc.) before including this header.
 */

/* Function Prototypes */

/* Unsigned 32-bit parser */
CLIPAR_BOOL parse_uint32_in_range(const CLIPAR_CHAR *arg, CLIPAR_UINT32 min, CLIPAR_UINT32 max, CLIPAR_UINT32 *out);

/* Unsigned 64-bit parser */
CLIPAR_BOOL parse_uint64_in_range(const CLIPAR_CHAR *arg, CLIPAR_UINT64 min, CLIPAR_UINT64 max, CLIPAR_UINT64 *out);

/* Signed integer parser */
CLIPAR_BOOL parse_int_in_range(const CLIPAR_CHAR *arg, CLIPAR_INT min, CLIPAR_INT max, CLIPAR_INT *out);

/* String option parser: Compares arg to each string in options.
 * On success, returns true and sets out_index to the matching option's index.
 */
CLIPAR_BOOL parse_string_option(const CLIPAR_CHAR *arg, const CLIPAR_CHAR *options[], CLIPAR_SIZE_T num_options, CLIPAR_UINT *out_index);

/* IPv4 address parser: Validates an IPv4 address in the format "X.X.X.X". */
CLIPAR_BOOL parse_ip_address(const CLIPAR_CHAR *arg);

/* IPv4 address with netmask parser: Validates an address of the form "X.X.X.X/Y". */
CLIPAR_BOOL parse_ip_address_with_netmask(const CLIPAR_CHAR *arg);

/* Boolean parser: Accepts "true", "1", "yes" for true and "false", "0", "no" for false (case-insensitive). */
CLIPAR_BOOL parse_bool(const CLIPAR_CHAR *arg, CLIPAR_BOOL *out);

/* Floating point parser: Parses a float and validates it is within [min, max]. */
CLIPAR_BOOL parse_float_in_range(const CLIPAR_CHAR *arg, CLIPAR_FLOAT min, CLIPAR_FLOAT max, CLIPAR_FLOAT *out);

/* Hexadecimal parser: Parses a hexadecimal number (optional "0x"/"0X" prefix) and validates it is within [min, max]. */
CLIPAR_BOOL parse_hex_in_range(const CLIPAR_CHAR *arg, CLIPAR_ULONG min, CLIPAR_ULONG max, CLIPAR_ULONG *out);

/* Custom parser callback type.
 * The custom validator function should follow this signature.
 */
typedef CLIPAR_BOOL (*custom_parser_t)(const CLIPAR_CHAR *arg, void *out);

/* Custom parser wrapper function */
CLIPAR_BOOL parse_custom(const CLIPAR_CHAR *arg, custom_parser_t validator, void *out);

#endif // CLI_ARGS_H

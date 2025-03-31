/**
 * @file cli_args.c
 * @brief Implementation of CLI argument parsing functions.
 *
 * This file implements functions to parse and validate CLI arguments.
 * All functions use fixed-size (stack) memory and type macros for maximum portability.
 */

#include "cli_args.h"
#include <stdlib.h>
#include <ctype.h>
#include <string.h>

/**
 * @brief Checks if the given string contains only digit characters.
 *
 * @param str The input string.
 * @return CLIPAR_BOOL true if the string contains only digits; false otherwise.
 */
static CLIPAR_BOOL is_digits(const CLIPAR_CHAR *str)
{
    if ((str == NULL) || (*str == '\0')) {
        return false;
    }
    for (const CLIPAR_CHAR *p = str; *p != '\0'; ++p) {
        if (!isdigit((unsigned char)*p)) {
            return false;
        }
    }
    return true;
}

/**
 * @brief Checks if the given string is a valid integer representation.
 *
 * Allows an optional '+' or '-' sign followed by digits.
 *
 * @param str The input string.
 * @return CLIPAR_BOOL true if valid; false otherwise.
 */
static CLIPAR_BOOL is_valid_int(const CLIPAR_CHAR *str)
{
    if ((str == NULL) || (*str == '\0')) {
        return false;
    }
    if ((*str == '-') || (*str == '+')) {
        str++;
    }
    return is_digits(str);
}

/**
 * @brief Checks if the given string contains only hexadecimal digit characters.
 *
 * @param str The input string.
 * @return CLIPAR_BOOL true if the string contains only valid hexadecimal characters; false otherwise.
 */
static CLIPAR_BOOL is_hex_digits(const CLIPAR_CHAR *str)
{
    if ((str == NULL) || (*str == '\0')) {
        return false;
    }
    for (const CLIPAR_CHAR *p = str; *p != '\0'; ++p) {
        CLIPAR_CHAR c = *p;
        if (!((c >= '0' && c <= '9') ||
              (c >= 'a' && c <= 'f') ||
              (c >= 'A' && c <= 'F'))) {
            return false;
        }
    }
    return true;
}

/**
 * @brief Compares two strings in a case-insensitive manner.
 *
 * @param s1 First string.
 * @param s2 Second string.
 * @return CLIPAR_BOOL true if the strings are equal ignoring case; false otherwise.
 */
static CLIPAR_BOOL iequals(const CLIPAR_CHAR *s1, const CLIPAR_CHAR *s2)
{
    while ((*s1 != '\0') && (*s2 != '\0')) {
        CLIPAR_CHAR c1 = *s1;
        CLIPAR_CHAR c2 = *s2;
        if ((c1 >= 'A') && (c1 <= 'Z')) {
            c1 = c1 + ('a' - 'A');
        }
        if ((c2 >= 'A') && (c2 <= 'Z')) {
            c2 = c2 + ('a' - 'A');
        }
        if (c1 != c2) {
            return false;
        }
        s1++;
        s2++;
    }
    return ((*s1 == '\0') && (*s2 == '\0'));
}

/**
 * @brief Parses an unsigned 32-bit integer from a string and validates its range.
 *
 * @param arg The input string.
 * @param min Minimum allowed value.
 * @param max Maximum allowed value.
 * @param out Pointer to store the parsed value.
 * @return CLIPAR_BOOL true if successful and within range; false otherwise.
 */
CLIPAR_BOOL parse_uint32_in_range(const CLIPAR_CHAR *arg, CLIPAR_UINT32 min, CLIPAR_UINT32 max, CLIPAR_UINT32 *out)
{
    if ((arg == NULL) || (*arg == '\0')) {
        return false;
    }
    if (!is_digits(arg)) {
        return false;
    }
    char *endptr = NULL;
    unsigned long val = strtoul(arg, &endptr, 10);
    if (*endptr != '\0') {
        return false;
    }
    if ((val < min) || (val > max)) {
        return false;
    }
    if (out != NULL) {
        *out = (CLIPAR_UINT32)val;
    }
    return true;
}

/**
 * @brief Parses an unsigned 64-bit integer from a string and validates its range.
 *
 * @param arg The input string.
 * @param min Minimum allowed value.
 * @param max Maximum allowed value.
 * @param out Pointer to store the parsed value.
 * @return CLIPAR_BOOL true if successful and within range; false otherwise.
 */
CLIPAR_BOOL parse_uint64_in_range(const CLIPAR_CHAR *arg, CLIPAR_UINT64 min, CLIPAR_UINT64 max, CLIPAR_UINT64 *out)
{
    if ((arg == NULL) || (*arg == '\0')) {
        return false;
    }
    if (!is_digits(arg)) {
        return false;
    }
    char *endptr = NULL;
    unsigned long long val = strtoull(arg, &endptr, 10);
    if (*endptr != '\0') {
        return false;
    }
    if ((val < min) || (val > max)) {
        return false;
    }
    if (out != NULL) {
        *out = (CLIPAR_UINT64)val;
    }
    return true;
}

/**
 * @brief Parses a signed integer from a string and validates its range.
 *
 * @param arg The input string.
 * @param min Minimum allowed value.
 * @param max Maximum allowed value.
 * @param out Pointer to store the parsed value.
 * @return CLIPAR_BOOL true if successful and within range; false otherwise.
 */
CLIPAR_BOOL parse_int_in_range(const CLIPAR_CHAR *arg, CLIPAR_INT min, CLIPAR_INT max, CLIPAR_INT *out)
{
    if ((arg == NULL) || (*arg == '\0')) {
        return false;
    }
    if (!is_valid_int(arg)) {
        return false;
    }
    char *endptr = NULL;
    long val = strtol(arg, &endptr, 10);
    if (*endptr != '\0') {
        return false;
    }
    if ((val < min) || (val > max)) {
        return false;
    }
    if (out != NULL) {
        *out = (CLIPAR_INT)val;
    }
    return true;
}

/**
 * @brief Parses a string option by comparing it against an array of valid options.
 *
 * @param arg The input string.
 * @param options Array of valid options.
 * @param num_options Number of elements in the options array.
 * @param out_index Pointer to store the index of the matching option.
 * @return CLIPAR_BOOL true if a matching option is found; false otherwise.
 */
CLIPAR_BOOL parse_string_option(const CLIPAR_CHAR *arg, const CLIPAR_CHAR *options[], CLIPAR_SIZE_T num_options, CLIPAR_UINT *out_index)
{
    if (arg == NULL) {
        return false;
    }
    for (CLIPAR_SIZE_T i = 0; i < num_options; i++) {
        if (strcmp(arg, options[i]) == 0) {
            if (out_index != NULL) {
                *out_index = (CLIPAR_UINT)i;
            }
            return true;
        }
    }
    return false;
}

/**
 * @brief Validates that the input string is a properly formatted IPv4 address.
 *
 * The IPv4 address must be in the format "X.X.X.X" where each X is an integer between 0 and 255.
 * A fixed-size stack buffer is used to avoid dynamic memory allocation.
 *
 * @param arg The input IPv4 address string.
 * @return CLIPAR_BOOL true if valid; false otherwise.
 */
CLIPAR_BOOL parse_ip_address(const CLIPAR_CHAR *arg)
{
    if ((arg == NULL) || (*arg == '\0')) {
        return false;
    }
    if (strlen(arg) > 15) {
        return false;
    }
    char ip_copy[16];
    strcpy(ip_copy, arg);
    
    CLIPAR_INT count = 0;
    CLIPAR_BOOL valid = true;
    char *token = strtok(ip_copy, ".");
    while (token != NULL) {
        if (!is_digits(token)) {
            valid = false;
            break;
        }
        long part = strtol(token, NULL, 10);
        if ((part < 0) || (part > 255)) {
            valid = false;
            break;
        }
        count++;
        token = strtok(NULL, ".");
    }
    if (count != 4) {
        valid = false;
    }
    return valid;
}

/**
 * @brief Validates that the input string is a properly formatted IPv4 address with netmask.
 *
 * Expects the format "X.X.X.X/Y", where "X.X.X.X" is a valid IPv4 address and Y is an integer between 0 and 32.
 *
 * @param arg The input string.
 * @return CLIPAR_BOOL true if valid; false otherwise.
 */
CLIPAR_BOOL parse_ip_address_with_netmask(const CLIPAR_CHAR *arg)
{
    if ((arg == NULL) || (*arg == '\0')) {
        return false;
    }
    const CLIPAR_CHAR *slash = strchr(arg, '/');
    if (slash == NULL) {
        return false;
    }
    CLIPAR_SIZE_T ip_len = (CLIPAR_SIZE_T)(slash - arg);
    if ((ip_len == 0) || (ip_len > 15)) {
        return false;
    }
    char ip_part[16];
    memcpy(ip_part, arg, ip_len);
    ip_part[ip_len] = '\0';
    
    if (!parse_ip_address(ip_part)) {
        return false;
    }
    
    const CLIPAR_CHAR *netmask_part = slash + 1;
    if ((*netmask_part) == '\0') {
        return false;
    }
    if (!is_digits(netmask_part)) {
        return false;
    }
    char *endptr = NULL;
    long netmask = strtol(netmask_part, &endptr, 10);
    if (*endptr != '\0') {
        return false;
    }
    if ((netmask < 0) || (netmask > 32)) {
        return false;
    }
    return true;
}

/**
 * @brief Parses a boolean value from a string.
 *
 * Accepts case-insensitive "true", "1", "yes" for true and "false", "0", "no" for false.
 *
 * @param arg The input string.
 * @param out Pointer to store the parsed boolean value.
 * @return CLIPAR_BOOL true if the string represents a valid boolean; false otherwise.
 */
CLIPAR_BOOL parse_bool(const CLIPAR_CHAR *arg, CLIPAR_BOOL *out)
{
    if (arg == NULL) {
        return false;
    }
    if (iequals(arg, "true") || iequals(arg, "1") || iequals(arg, "yes")) {
        if (out != NULL) {
            *out = true;
        }
        return true;
    }
    if (iequals(arg, "false") || iequals(arg, "0") || iequals(arg, "no")) {
        if (out != NULL) {
            *out = false;
        }
        return true;
    }
    return false;
}

/**
 * @brief Parses a floating point number from a string and validates its range.
 *
 * @param arg The input string.
 * @param min Minimum allowed value.
 * @param max Maximum allowed value.
 * @param out Pointer to store the parsed float.
 * @return CLIPAR_BOOL true if successful and within range; false otherwise.
 */
CLIPAR_BOOL parse_float_in_range(const CLIPAR_CHAR *arg, CLIPAR_FLOAT min, CLIPAR_FLOAT max, CLIPAR_FLOAT *out)
{
    if ((arg == NULL) || (*arg == '\0')) {
        return false;
    }
    char *endptr = NULL;
    CLIPAR_FLOAT val = strtof(arg, &endptr);
    if (*endptr != '\0') {
        return false;
    }
    if ((val < min) || (val > max)) {
        return false;
    }
    if (out != NULL) {
        *out = val;
    }
    return true;
}

/**
 * @brief Parses a hexadecimal number from a string and validates its range.
 *
 * Accepts an optional "0x" or "0X" prefix.
 *
 * @param arg The input string.
 * @param min Minimum allowed value.
 * @param max Maximum allowed value.
 * @param out Pointer to store the parsed hexadecimal value.
 * @return CLIPAR_BOOL true if successful and within range; false otherwise.
 */
CLIPAR_BOOL parse_hex_in_range(const CLIPAR_CHAR *arg, CLIPAR_ULONG min, CLIPAR_ULONG max, CLIPAR_ULONG *out)
{
    if ((arg == NULL) || (*arg == '\0')) {
        return false;
    }
    if ((arg[0] == '0') && ((arg[1] == 'x') || (arg[1] == 'X'))) {
        arg += 2;
    }
    if (!is_hex_digits(arg)) {
        return false;
    }
    char *endptr = NULL;
    CLIPAR_ULONG val = strtoul(arg, &endptr, 16);
    if (*endptr != '\0') {
        return false;
    }
    if ((val < min) || (val > max)) {
        return false;
    }
    if (out != NULL) {
        *out = val;
    }
    return true;
}

/**
 * @brief Parses an argument using a custom validator callback.
 *
 * The custom validator function must adhere to the custom_parser_t signature.
 *
 * @param arg The input string.
 * @param validator The custom validation function.
 * @param out Pointer to store the parsed value.
 * @return CLIPAR_BOOL true if the validator returns true; false otherwise.
 */
CLIPAR_BOOL parse_custom(const CLIPAR_CHAR *arg, custom_parser_t validator, void *out)
{
    if ((arg == NULL) || (validator == NULL)) {
        return false;
    }
    return validator(arg, out);
}

/**
 * Utility functions for safe array operations
 */

/**
 * Ensures a value is an array, returning empty array if not
 * @param {*} value - The value to check
 * @returns {Array} - An array (empty if value is not an array)
 */
export const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  // If it's an object with a results property (paginated response)
  if (typeof value === 'object' && value.results && Array.isArray(value.results)) {
    return value.results;
  }
  return [];
};

/**
 * Safely maps over an array, filtering out null/undefined values
 * @param {Array} array - The array to map over
 * @param {Function} callback - The map function
 * @returns {Array} - Mapped array with null/undefined filtered out
 */
export const safeMap = (array, callback) => {
  const safeArray = ensureArray(array);
  return safeArray
    .map(callback)
    .filter((item) => item !== null && item !== undefined);
};

/**
 * Safely filters an array
 * @param {Array} array - The array to filter
 * @param {Function} callback - The filter function
 * @returns {Array} - Filtered array
 */
export const safeFilter = (array, callback) => {
  const safeArray = ensureArray(array);
  return safeArray.filter(callback);
};

/**
 * Safely reduces an array
 * @param {Array} array - The array to reduce
 * @param {Function} callback - The reduce function
 * @param {*} initialValue - Initial value for reduce
 * @returns {*} - Reduced value
 */
export const safeReduce = (array, callback, initialValue) => {
  const safeArray = ensureArray(array);
  return safeArray.reduce(callback, initialValue);
};


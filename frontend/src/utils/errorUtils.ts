/**
 * Utility function to extract user-friendly error messages from API responses
 */
export const getErrorMessage = (error: any, defaultMessage: string = 'An error occurred'): string => {
  if (typeof error === 'string') {
    return error;
  }

  // Helper function to ensure we get a string value
  const extractString = (value: any): string | null => {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value?.message) return String(value.message);
    if (typeof value === 'object' && value?.error) return String(value.error);
    return null;
  };

  // Handle different error response structures
  const possibleMessages = [
    error?.response?.data?.message,
    error?.response?.data?.error,
    error?.response?.data?.error?.message,
    error?.data?.message,
    error?.data?.error,
    error?.message
  ];

  for (const msg of possibleMessages) {
    const extracted = extractString(msg);
    if (extracted) return extracted;
  }

  return defaultMessage;
};

/**
 * Utility function to extract status code from error responses
 */
export const getErrorStatus = (error: any): number | null => {
  return error?.response?.status ||
         error?.status ||
         null;
};

/**
 * Utility function to create comprehensive error messages with status codes
 */
export const getDetailedErrorMessage = (error: any, defaultMessage: string = 'An error occurred'): string => {
  const message = getErrorMessage(error, defaultMessage);
  const status = getErrorStatus(error);
  
  // Ensure message is always a string
  const safeMessage = typeof message === 'string' ? message : String(message || defaultMessage);
  
  if (status) {
    return `${safeMessage} (Status: ${status})`;
  }
  
  return safeMessage;
};
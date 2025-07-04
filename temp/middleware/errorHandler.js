const winston = require('winston');

// Configurar logger para errores
const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Tipos de errores conocidos
const ErrorTypes = {
  VALIDATION_ERROR: 'validation_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  AUTHORIZATION_ERROR: 'authorization_error',
  WALLET_ERROR: 'wallet_error',
  BLOCKCHAIN_ERROR: 'blockchain_error',
  TRANSACTION_ERROR: 'transaction_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  EXTERNAL_API_ERROR: 'external_api_error',
  DATABASE_ERROR: 'database_error',
  INTERNAL_ERROR: 'internal_error'
};

// Códigos de error personalizados
const ErrorCodes = {
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  API_TIMEOUT: 'API_TIMEOUT',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

class AppError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL_ERROR, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Factory functions para tipos específicos de errores
const createValidationError = (message, details = null) => {
  return new AppError(message, ErrorTypes.VALIDATION_ERROR, 400, null, details);
};

const createAuthenticationError = (message, code = ErrorCodes.WALLET_NOT_CONNECTED) => {
  return new AppError(message, ErrorTypes.AUTHENTICATION_ERROR, 401, code);
};

const createWalletError = (message, code = null, details = null) => {
  return new AppError(message, ErrorTypes.WALLET_ERROR, 400, code, details);
};

const createBlockchainError = (message, code = null, details = null) => {
  return new AppError(message, ErrorTypes.BLOCKCHAIN_ERROR, 503, code, details);
};

const createTransactionError = (message, code = ErrorCodes.TRANSACTION_FAILED, details = null) => {
  return new AppError(message, ErrorTypes.TRANSACTION_ERROR, 400, code, details);
};

const createExternalApiError = (message, service = null, details = null) => {
  return new AppError(
    message, 
    ErrorTypes.EXTERNAL_API_ERROR, 
    503, 
    ErrorCodes.API_TIMEOUT, 
    { service, ...details }
  );
};

// Middleware de manejo de errores global
const globalErrorHandler = (err, req, res, next) => {
  let error = err;

  // Si no es un AppError, convertirlo
  if (!err.isOperational) {
    error = convertToAppError(err);
  }

  // Log del error
  logError(error, req);

  // Responder al cliente
  sendErrorResponse(error, req, res);
};

// Convertir errores nativos a AppError
const convertToAppError = (err) => {
  let message = 'Error interno del servidor';
  let type = ErrorTypes.INTERNAL_ERROR;
  let statusCode = 500;
  let code = null;
  let details = null;

  // Errores de validación de Express
  if (err.name === 'ValidationError') {
    message = 'Datos de entrada inválidos';
    type = ErrorTypes.VALIDATION_ERROR;
    statusCode = 400;
    details = err.errors;
  }
  
  // Errores de JWT
  else if (err.name === 'JsonWebTokenError') {
    message = 'Token de autenticación inválido';
    type = ErrorTypes.AUTHENTICATION_ERROR;
    statusCode = 401;
    code = ErrorCodes.INVALID_SIGNATURE;
  }
  
  // Errores de timeout
  else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
    message = 'Timeout de conexión con servicio externo';
    type = ErrorTypes.EXTERNAL_API_ERROR;
    statusCode = 503;
    code = ErrorCodes.API_TIMEOUT;
  }
  
  // Errores de red
  else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    message = 'Error de conexión de red';
    type = ErrorTypes.EXTERNAL_API_ERROR;
    statusCode = 503;
    code = ErrorCodes.NETWORK_ERROR;
  }
  
  // Errores de rate limiting
  else if (err.status === 429) {
    message = 'Demasiadas solicitudes. Intenta de nuevo más tarde.';
    type = ErrorTypes.RATE_LIMIT_ERROR;
    statusCode = 429;
  }
  
  // Errores de parsing JSON
  else if (err.type === 'entity.parse.failed') {
    message = 'Formato JSON inválido';
    type = ErrorTypes.VALIDATION_ERROR;
    statusCode = 400;
  }
  
  // Mantener mensaje original si está disponible
  if (err.message && process.env.NODE_ENV === 'development') {
    details = { originalMessage: err.message, stack: err.stack };
  }

  return new AppError(message, type, statusCode, code, details);
};

// Logging de errores
const logError = (error, req) => {
  const logData = {
    timestamp: error.timestamp,
    type: error.type,
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.sessionID,
    walletAddress: req.session?.walletAddress,
    stack: error.stack,
    details: error.details
  };

  // Log crítico para errores 5xx
  if (error.statusCode >= 500) {
    errorLogger.error('Critical server error', logData);
  } else {
    errorLogger.warn('Client error', logData);
  }

  // Log adicional en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error details:', logData);
  }
};

// Enviar respuesta de error al cliente
const sendErrorResponse = (error, req, res) => {
  const response = {
    success: false,
    error: {
      type: error.type,
      message: error.message,
      code: error.code,
      timestamp: error.timestamp
    }
  };

  // Incluir detalles adicionales en desarrollo
  if (process.env.NODE_ENV === 'development') {
    response.error.details = error.details;
    response.error.stack = error.stack;
  }

  // Headers de seguridad
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });

  res.status(error.statusCode).json(response);
};

// Middleware para capturar errores asíncronos
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware para validar parámetros requeridos
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = [];
    
    fields.forEach(field => {
      const value = req.body[field] || req.params[field] || req.query[field];
      if (!value) {
        missing.push(field);
      }
    });
    
    if (missing.length > 0) {
      throw createValidationError(
        `Parámetros requeridos faltantes: ${missing.join(', ')}`,
        { missingFields: missing }
      );
    }
    
    next();
  };
};

// Middleware para validar wallet conectada
const requireWallet = (req, res, next) => {
  if (!req.session.walletConnected || !req.session.walletAddress) {
    throw createAuthenticationError(
      'Wallet no conectada. Conecta tu wallet antes de continuar.',
      ErrorCodes.WALLET_NOT_CONNECTED
    );
  }
  next();
};

// Middleware para validar formato de dirección
const validateAddress = (paramName = 'address') => {
  return (req, res, next) => {
    const address = req.params[paramName] || req.body[paramName];
    
    if (!address) {
      throw createValidationError(`Dirección ${paramName} es requerida`);
    }
    
    // Validación básica de formato
    if (!/^[a-zA-Z0-9]{25,100}$/.test(address)) {
      throw createWalletError(
        'Formato de dirección inválido',
        ErrorCodes.INVALID_ADDRESS,
        { address, paramName }
      );
    }
    
    next();
  };
};

// Middleware para manejar timeouts
const timeoutHandler = (timeoutMs = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      throw createExternalApiError(
        `Request timeout después de ${timeoutMs}ms`,
        'timeout',
        { timeoutMs, url: req.originalUrl }
      );
    });
    next();
  };
};

// Handler para 404
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    ErrorTypes.VALIDATION_ERROR,
    404,
    'ROUTE_NOT_FOUND',
    { method: req.method, url: req.originalUrl }
  );
  next(error);
};

// Manejo de shutdown graceful
const gracefulShutdown = () => {
  errorLogger.info('Shutting down error handler gracefully');
  // Cerrar streams de logging si es necesario
  setTimeout(() => {
    process.exit(0);
  }, 5000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = {
  AppError,
  ErrorTypes,
  ErrorCodes,
  createValidationError,
  createAuthenticationError,
  createWalletError,
  createBlockchainError,
  createTransactionError,
  createExternalApiError,
  globalErrorHandler,
  asyncHandler,
  validateRequired,
  requireWallet,
  validateAddress,
  timeoutHandler,
  notFoundHandler,
  errorLogger
};
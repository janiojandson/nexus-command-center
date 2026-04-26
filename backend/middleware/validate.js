/**
 * ============================================================
 * NEXUS COMMAND CENTER — Middleware de Validação de Input
 * ============================================================
 * Valida e sanitiza inputs antes de chegarem aos controllers.
 * Previne XSS, injeção de dados malformados e ataques de payload.
 * Sem dependências externas — validação nativa com regex e tipos.
 * ============================================================
 */

/**
 * Sanitiza uma string removendo caracteres perigosos.
 * Remove tags HTML, scripts e caracteres de controle.
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '')                                              // Remove HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '')                                     // Remove control chars
    .trim();
}

/**
 * Sanitiza recursivamente um objeto ou array.
 */
function sanitizeDeep(input) {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  if (Array.isArray(input)) {
    return input.map(item => sanitizeDeep(item));
  }
  if (input !== null && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeDeep(value);
    }
    return sanitized;
  }
  return input;
}

/**
 * Regras de validação suportadas:
 * - type: 'string' | 'number' | 'boolean' | 'array' | 'object'
 * - required: boolean
 * - minLength: number (para strings)
 * - maxLength: number (para strings)
 * - min: number (para numbers)
 * - max: number (para numbers)
 * - pattern: RegExp (para strings)
 * - enum: array de valores permitidos
 * - sanitize: boolean (aplicar sanitização)
 */
function validateField(value, rules, fieldName) {
  const errors = [];

  // Required check
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} é obrigatório`);
    return { valid: false, errors, sanitized: value };
  }

  // Se não é required e está vazio, passa
  if (value === undefined || value === null) {
    return { valid: true, errors: [], sanitized: value };
  }

  // Type check
  if (rules.type === 'string' && typeof value !== 'string') {
    errors.push(`${fieldName} deve ser uma string`);
  } else if (rules.type === 'number' && (typeof value !== 'number' || isNaN(value))) {
    errors.push(`${fieldName} deve ser um número`);
  } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${fieldName} deve ser um booleano`);
  } else if (rules.type === 'array' && !Array.isArray(value)) {
    errors.push(`${fieldName} deve ser um array`);
  } else if (rules.type === 'object' && (typeof value !== 'object' || Array.isArray(value) || value === null)) {
    errors.push(`${fieldName} deve ser um objeto`);
  }

  if (errors.length > 0) {
    return { valid: false, errors, sanitized: value };
  }

  // String validations
  if (rules.type === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} deve ter pelo menos ${rules.minLength} caracteres`);
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} deve ter no máximo ${rules.maxLength} caracteres`);
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} tem formato inválido`);
    }
  }

  // Number validations
  if (rules.type === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${fieldName} deve ser pelo menos ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${fieldName} deve ser no máximo ${rules.max}`);
    }
  }

  // Enum validation
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(`${fieldName} deve ser um de: ${rules.enum.join(', ')}`);
  }

  // Sanitize
  let sanitized = value;
  if (rules.sanitize !== false) {
    sanitized = sanitizeDeep(value);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Factory de middleware de validação.
 * @param {Object} schema - Mapa de campo → regras de validação
 * @param {string} source - 'body' | 'query' | 'params'
 * @returns {Function} Express middleware
 * 
 * Uso:
 *   const validateLogin = validate({ password: { type: 'string', required: true, minLength: 6 } });
 *   router.post('/login', validateLogin, controller);
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source] || {};
    const allErrors = [];
    const sanitizedData = {};

    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = data[fieldName];
      const result = validateField(value, rules, fieldName);

      if (!result.valid) {
        allErrors.push(...result.errors);
      }
      sanitizedData[fieldName] = result.sanitized;
    }

    if (allErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validação falhou',
        code: 'VALIDATION_ERROR',
        details: allErrors,
      });
    }

    // Substituir dados originais pelos sanitizados
    req[source] = { ...data, ...sanitizedData };
    next();
  };
}

module.exports = { validate, sanitizeString, sanitizeDeep, validateField };

const { authenticate } = require('./auth');

const requireAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token necessário para acesso protegido' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ 
      success: false, 
      error: 'Sessão expirada, faça login novamente' 
    });
  }
};

module.exports = { requireAuth };
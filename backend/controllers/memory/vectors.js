const MemoryService = require('../../services/memory');

exports.vectors = async (req, res) => {
  try {
    const vectors = await MemoryService.getAllVectors();
    
    res.json({
      success: true,
      vectors,
      count: vectors.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
const Beneficiary = require('../models/Beneficiary');

// Create beneficiary
const createBeneficiary = async (req, res) => {
  try {
    const { name, phoneNumber, network, isDefault } = req.body;
    const userId = req.user._id;

    // Check if phone number already exists for this user
    const existingBeneficiary = await Beneficiary.findOne({
      user: userId,
      phoneNumber
    });

    if (existingBeneficiary) {
      return res.status(400).json({
        success: false,
        message: 'Beneficiary with this phone number already exists'
      });
    }

    // Create new beneficiary
    const beneficiary = new Beneficiary({
      user: userId,
      name,
      phoneNumber,
      network,
      isDefault: isDefault || false
    });

    await beneficiary.save();

    res.status(201).json({
      success: true,
      message: 'Beneficiary created successfully',
      data: {
        beneficiary: beneficiary.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Create beneficiary error:', error);
    
    if (error.message.includes('Maximum of 5 beneficiaries')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create beneficiary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all beneficiaries
const getBeneficiaries = async (req, res) => {
  try {
    const userId = req.user._id;

    const beneficiaries = await Beneficiary.find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      data: {
        beneficiaries: beneficiaries.map(b => b.getPublicProfile())
      }
    });
  } catch (error) {
    console.error('Get beneficiaries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch beneficiaries',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get beneficiary by ID
const getBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const beneficiary = await Beneficiary.findOne({
      _id: id,
      user: userId
    });

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    res.json({
      success: true,
      data: {
        beneficiary: beneficiary.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get beneficiary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch beneficiary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update beneficiary
const updateBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber, network, isDefault } = req.body;
    const userId = req.user._id;

    // Check if beneficiary exists and belongs to user
    const beneficiary = await Beneficiary.findOne({
      _id: id,
      user: userId
    });

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    // Check if phone number is already taken by another beneficiary
    if (phoneNumber && phoneNumber !== beneficiary.phoneNumber) {
      const existingBeneficiary = await Beneficiary.findOne({
        user: userId,
        phoneNumber,
        _id: { $ne: id }
      });

      if (existingBeneficiary) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already taken by another beneficiary'
        });
      }
    }

    // Update beneficiary
    const updatedBeneficiary = await Beneficiary.findByIdAndUpdate(
      id,
      { name, phoneNumber, network, isDefault },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Beneficiary updated successfully',
      data: {
        beneficiary: updatedBeneficiary.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Update beneficiary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update beneficiary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete beneficiary
const deleteBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if beneficiary exists and belongs to user
    const beneficiary = await Beneficiary.findOne({
      _id: id,
      user: userId
    });

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    await Beneficiary.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Beneficiary deleted successfully'
    });
  } catch (error) {
    console.error('Delete beneficiary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete beneficiary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Set default beneficiary
const setDefaultBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if beneficiary exists and belongs to user
    const beneficiary = await Beneficiary.findOne({
      _id: id,
      user: userId
    });

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    // Set this beneficiary as default (this will automatically unset others)
    beneficiary.isDefault = true;
    await beneficiary.save();

    res.json({
      success: true,
      message: 'Default beneficiary updated successfully',
      data: {
        beneficiary: beneficiary.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Set default beneficiary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default beneficiary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get default beneficiary
const getDefaultBeneficiary = async (req, res) => {
  try {
    const userId = req.user._id;

    const defaultBeneficiary = await Beneficiary.findOne({
      user: userId,
      isDefault: true
    });

    if (!defaultBeneficiary) {
      return res.status(404).json({
        success: false,
        message: 'No default beneficiary found'
      });
    }

    res.json({
      success: true,
      data: {
        beneficiary: defaultBeneficiary.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get default beneficiary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default beneficiary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  createBeneficiary,
  getBeneficiaries,
  getBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  setDefaultBeneficiary,
  getDefaultBeneficiary
};

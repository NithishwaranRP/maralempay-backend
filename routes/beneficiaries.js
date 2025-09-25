const express = require('express');
const router = express.Router();
const {
  createBeneficiary,
  getBeneficiaries,
  updateBeneficiary,
  deleteBeneficiary
} = require('../controllers/beneficiaryController');
const { validateBeneficiary } = require('../middleware/validation');
const { authenticateUser } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateUser);

router.post('/', validateBeneficiary, createBeneficiary);
router.get('/', getBeneficiaries);
router.put('/:id', validateBeneficiary, updateBeneficiary);
router.delete('/:id', deleteBeneficiary);

module.exports = router;
const express = require('express');
const c = require('../controllers/tableController');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', c.getTables);
router.get('/:id', c.getTableById);
router.post('/', c.createTable);
router.put('/:id', c.updateTable);
router.delete('/:id', c.deleteTable);

module.exports = router;

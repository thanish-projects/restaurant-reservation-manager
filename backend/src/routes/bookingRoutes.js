const express = require('express');
const c = require('../controllers/bookingController');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', c.getBookings);
router.get('/:id', c.getBookingById);
router.post('/', c.createBooking);
router.put('/:id', c.updateBooking);
router.delete('/:id', c.deleteBooking);

module.exports = router;

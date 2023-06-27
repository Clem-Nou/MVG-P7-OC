const express = require('express');

const router = express.Router();

const auth = require('../middleware/auth');
const bookCtrl = require('../controllers/book');
const multer = require('../middleware/multer-config');

router.get('/', bookCtrl.getAllBooks);

module.exports = router;

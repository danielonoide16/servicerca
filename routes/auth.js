const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('ServiCerca funcionando');
});

module.exports = router;

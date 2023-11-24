const Router = require("express");
const router = new Router();
const auth = require('../middleware/auth');
const { create, getAllWorkers, update, del, getOne, updatePageOperation } = require("../controllers/worker");




// router.post('/registration',validation, register)

router.get('/', auth, getAllWorkers);

router.post('/', create);

router.get('/list', auth, updatePageOperation);

router.put("/:id", auth, update );

router.get('/:id', auth, getOne);



router.delete('/:id', auth, del);


module.exports = router
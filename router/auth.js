const Router = require("express");
const router = new Router();
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const { login, getUser, checkuser, checklogin, addadmin } = require("../controllers/auth");




// router.post('/registration',validation, register)

router.get('/login/addadmin', addadmin);

router.post('/login', login);

router.post('/checkuser',auth, checkuser);

router.post('/checklogin',auth, checklogin);

router.get('/getuser', auth, getUser);


module.exports = router
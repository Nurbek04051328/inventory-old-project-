const Router = require("express");
const router = new Router();
const authMiddleware = require('../middleware/auth');
const { getUsers, update, edit, del } = require('../controllers/user');


router.get('/', authMiddleware, getUsers);

router.get('/edit/:id', authMiddleware, edit);

router.post('/save/:id', authMiddleware, update);

router.get('/delete/:id', authMiddleware, del);





module.exports = router;
const {Router} = require('express')
const router = Router()


const authRouter = require("./router/auth");
const userRouter = require("./router/user");


router.use('/auth', authRouter);
router.use('/user', userRouter);

router.use('/page', require(("./router/page")))
router.use('/worker', require(("./router/worker")))




module.exports = router
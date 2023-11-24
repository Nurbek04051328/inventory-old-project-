const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const config = require('config');
const User = require("../models/user");
const {validationResult} = require("express-validator");
const Worker = require("../models/worker");



// const register = async (req, res) => {
//     try {
//         const errors = validationResult(req)
//         if (!errors.isEmpty()) {
//             return res.status(400).json({message: "Ошибка", errors})
//         }
//         let {login, password} = req.body
//         login = login.toLowerCase()
//         const haveLogin = await User.findOne({login})
//         if (haveLogin) {
//             return res.status(400).json({message: `${login} пользователь уже есть!`})
//         }
//         const hashPassword = await bcrypt.hashSync(password, 7)
//         let role = 1
//         if (login == 'admin') {
//             role = 0
//         }
//         const user = await new User({login, password: hashPassword,role})
//         await user.save()
//         res.send({message: `Успешно добавлено`})
//     } catch (e) {
//         console.log(e);
//         res.send({message: "Сервере ошибка"})
//     }
// }

const addadmin = async (req, res) => {
    try {
        let check = await User.findOne({login:'admin'})
        if (check){
            res.send({message: "Ошибка, Такой админ уже есть"})
        } else {
            const hashPass = await bcrypt.hash('12345', 10)
            let admin =  await new User({login:'admin', password: hashPass,role:0,name:'Admin'})
            await admin.save()
            res.send({message: "Админ создан"})
        }
    } catch (e) {
        console.log(e);
        res.send({message: "Сервере ошибка"})
    }
}

const checklogin = async(req,res) => {
    try {
        let {login} = req.body
        login = login.toLowerCase()
        const user = await User.findOne({login})
        if (user) {
            return res.status(400).json({message: "Пользователь с таким логином есть!"})
        } else {
            return res.status(200).json({message: "ок"})
        }
    } catch (error) {
        console.log(e);
        res.send({message: "Ошибка"})
    }
}

const login = async (req, res) => {
    try {
        let {login, password} = req.body
        if (login) {
            login = login.toLowerCase()
        }
        const user = await User.findOne({login})
        if (!user) {
            return res.status(404).json({message: "Пользователь не найдено!"})
        }
        let worker = await Worker.findOne({user:user._id}).lean()
        if (worker) {
            worker.lastseans = Date.now()
            await Worker.findOneAndUpdate({_id:worker._id},worker)
        }
        const isPassValid = bcrypt.compareSync(password, user.password)
        if (!isPassValid) {
            return res.status(400).json({message: "Пароль не правильно!"})
        }
        const token = jwt.sign({id: user.id}, config.get("secretKey"), {expiresIn: "1d"})
        return res.status(200).json({
            token,
            user: {
                id: user.id,
                login: user.login,
                role: user.role
            }
        })
    } catch (e) {
        console.log(e);
        res.send({message: "Serverda xatolik"})
    }
}

const checkuser = async (req,res) => {
    try {
        const user = await User.findOne({_id: req.user.id})
        if (!user){
            return res.status(404).json({message: "Пользователь не найдено!"})
        }
        res.status(200).json(user)
    } catch(e){
        console.log(e);
        res.send({message: 'error'})
    }
}

const getUser = async (req, res) => {
    try {
        const user = await User.findOne({_id: req.user.id})
        const token = jwt.sign({id: user.id}, config.get("secretKey"), {expiresIn: "1d"})
        return res.json({
            token,
            user: {
                id: user.id,
                login: user.login,
                role: user.role
            }
        })
    } catch (e) {
        console.log(e);
        res.send({message: "Сервере ошибка"})
    }
}

module.exports = { addadmin, login, getUser, checkuser, checklogin }
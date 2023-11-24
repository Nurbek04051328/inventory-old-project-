const bcrypt = require('bcrypt')
const Worker = require("../models/worker");
const User = require("../models/user");
const fs = require('fs')
const mogoose = require('mongoose')



const getAllWorkers = async (req, res) => {
    try {
        workers = await Worker.find()
            .sort({_id:-1}).lean()
        res.status(200).send(workers)
    } catch (e) {
        console.log(e)
        res.send({message: "Ошибка в сервере"})
    }
}



const create = async (req, res) => {
    try {
        let { login, password, name,lname,sname, phone, list, status } = req.body
        status = status || 1
        let role = 1
        let lastseans = Date.now()
        const hashPass = await bcrypt.hash(password, 10)
        let haveLogin = await User.findOne({login})
        if (haveLogin) {
            return res.status(400).json({message: `${login} bu login tizimda allaqachon mavjud`})
        }
        let newUser = new User({login, role, password:hashPass })
        await newUser.save()
        const worker = new Worker({ user:newUser._id, name, lname,sname, phone, list, status,lastseans, createdAt:Date.now() })
        await worker.save()
        let _id = worker._id
        let saveWoker = await Worker.findOne({_id}).populate('user').lean()
        res.status(201).send(saveWoker)
    } catch (e) {
        console.log(e)
        res.send({message: "Ошибка в сервере"})
    }
}

const update = async (req, res) => {
    try {
        if (req.params.id) {
            let id = req.params.id
            let { login, password, name,lname,sname, phone, list, status } = req.body
            status = status || 1
            let worker = await Worker.findOneAndUpdate({_id:id},{ name,lname,sname, phone, list, status, updateAt:Date.now()}, {returnDocument: 'after'})
            let userId = worker.user._id
            let user = await User.findOne({_id: userId})
            user.login = login
            if(password) {
                const hashPass = await bcrypt.hash(password, 10)
                user.password = hashPass
            }
            await User.findByIdAndUpdate(user._id,user)
            let saveWorker = await Worker.findOne({_id:worker._id}).populate('user').lean()
            res.status(200).json(saveWorker)
        } else {
            res.status(500).send({message: "Не найдено"})
        }
    } catch (e) {
        console.log(e)
        res.send({message: "Ошибка в сервере"})
    }
}

const del = async(req,res)=>{
    if (req.params.id) {
        let _id = req.params.id
        let worker = await Worker.findByIdAndDelete(_id)
        await User.findByIdAndDelete({_id:worker.user})
        res.status(200).send(_id)
    } else {
        res.status(500).send({message: "Не найдено"})
    }
}

const getLoginAdmin = async (req, res) => {
    try {
        let login = req.query.login
        login = login.toLowerCase()
        let user = await User.findOne({login:login}).lean()
        if (user) {
            res.send({message: "Bunday login oldin ruyhatdan utgan"})
        } else {
            res.send({message: ""})
        }

    } catch (e) {
        console.log(e)
        res.send({message: "Ошибка в сервере"})
    }
}

const getOne = async (req, res) => {
    try {
        if (req.params.id) {
            const _id = req.params.id
            let worker = await Worker.findOne({_id}).populate('user').lean()
            res.status(200).send(worker)
        } else {
            res.status(500).send({message: "Не найдено"})
        }
    } catch (e) {
        console.log(e)
        res.send({message: "Ошибка в сервере"})
    }
}

const updatePageOperation = async (req, res) => {
    try {
        let userId = req.query.userId
        let pageId = req.query.pageId
        let oper = req.query.oper
        let worker = await Worker.findOne({_id:userId}).lean()
        worker.list = await Promise.all(worker.list.map(async item => {
            if (pageId == item.selectId) {
                if(item.operations.includes(oper)){
                    let index = item.operations.indexOf(oper)
                    item.operations.splice(index, 1)
                }else{
                    item.operations.push(oper)
                }
            }
            return item
        }))
        let saveWorker = await Worker.findByIdAndUpdate(userId, worker);
        let sendWorker = await Worker.findOne({_id:saveWorker._id}).populate('user').lean()
        res.send(sendWorker)
    } catch (e) {
        console.log(e)
        res.send({message: "Ошибка в сервере"})
    }
}


// const changeStatusAdminCenters = async (req, res) => {
//     try {
//         if (req.params.id) {
//             const _id = req.params.id
//             let admincenter = await AdminCenter.findOne({_id}).lean()
//             admincenter.status = admincenter.status == 0 ? 1 : 0
//             let upstatus = await AdminCenter.findByIdAndUpdate(_id,admincenter)
//             let saveAdminCenter = await AdminCenter.findOne({_id:_id}).populate('user').lean()
//             res.status(200).send(saveAdminCenter)
//         }
//     } catch (e) {
//         console.log(e)
//         res.send({message: "Ошибка в сервере"})
//     }
// }



module.exports = { create, getAllWorkers, del, update, getLoginAdmin, getOne, updatePageOperation }
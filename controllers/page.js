const Page = require("../models/page");
const Field = require("../models/field");
const Worker = require("../models/worker");
const ObjectId = require('mongodb').ObjectId;
const jwt = require('jsonwebtoken')
const config = require('config');
const mongoose = require('mongoose');

const fs = require('fs')
const path = require("path")
const ExcellJs = require('exceljs')



// mongo collectionga boglanish
var MongoClient = require('mongodb').MongoClient;
const mongoUrl = 'mongodb://127.0.0.1:27017/inventor';
const client = new MongoClient(mongoUrl);



// Pagelarni Foydalanuvchiga qarab olib berish
const getPages = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]
        const decoded = jwt.verify(token, config.get('secretKey'))
        worker = await Worker.findOne({user:decoded.id}).lean()
        let pages = []
        if (worker) {
            worker.list = await Promise.all(worker.list.map(async item => {
                let page = await Page.findOne({_id: item.selectId}).sort({order:1}).lean()
                pages.push(page)
                return item
            }))
        } else {
            pages = await Page.find().sort({order:1}).lean()
        }
        res.status(200).send(pages)
    } catch (e) {
        console.log(e)
        res.status(500).send({message: "Ошибка в сервере"})
    }
}

// Page nomi bor yoki yo'qligiga tekshirish
const getPageName = async (req, res) => {
    try {
        let name = req.query.name
        let page = await Page.find().lean()
        let sendMesage = null
        page.forEach(item=> {
            if (item.name.toLowerCase() == name.toLowerCase()) {
                sendMesage = "Такая страница уже существует"
            }
        })
        if (sendMesage) {
            res.status(200).send(sendMesage)
        }
    } catch (e) {
        console.log(e)
        res.status(500).send({message: "Ошибка в сервере"})
    }
}

// Ichma ich childga kirganda aynan shu otasiga tegishli childlarni olib beradi
const getQueryPage = async (req, res) => {
    try {
        let itemId = req.query.itemId
        if (req.params.id) {
            const _id = req.params.id
            let fatherPage = await Page.findOne({_id: _id}).lean()
            let childPage = await Page.findOne({$and:[{parent: _id}, {"_id":{$ne:_id}}]}).lean()
            if (childPage) {
                const db = client.db('inventor');
                const collection = db.collection(childPage.model);
                let fields = await Field.find({page:fatherPage._id}).sort({sort:1}).lean()
                let fieldss = await Field.find({page:childPage._id}).sort({sort:1}).lean()
                let allDatas = await collection.find().toArray();
                let obj = {}
                allDatas.forEach(data => {
                    fieldss.forEach(item => {
                        if (itemId) {
                            if(item.types == '2' &&  data[item.slug] == ObjectId(itemId)){
                                obj[item.slug] = itemId
                            }

                        }
                    })
                })
                let datas = await collection.aggregate([{ $match : {...obj} }]).toArray();
                let sendPage = {
                    fields: fieldss,
                    datas:datas,
                    count: datas.length,
                    title: childPage.name,
                    text: childPage.text
                }
                let sendData = {
                    pageId: childPage._id,
                    data: datas[0]
                }
                console.log("ketdi",sendData)
                res.status(200).send(sendData)
            } else {
                res.status(400).send({message: "Нет страницы, связанной с этой страницей"})
            }
        }
    } catch (e) {
        console.log(e)
        res.status(500).send({message: "Ошибка в сервере"})
    }
}

// Childidagi selectdagini tanlash uchun
const getSelectPages = async (req, res) => {
    try {
        if (req.params.id) {
            const _id = req.params.id
            const currentPageId = req.query.pageId
            let page = await Page.findOne({_id: _id}).lean()
            let currentPage = await Page.findOne({_id: currentPageId}).lean()
            await client.connect();
            const db = client.db('inventor');
            const collection = db.collection(page.model);

            let datas = await collection.find().toArray();
            let currentField = await Field.find({page: currentPageId}).lean()
            let selectField = await Field.findOne({page:_id ,types:1}).lean()
            fieldss = currentField.filter(field => field.types == 2)
            fieldss.forEach(field => {
                datas.forEach(data => {
                    data[field.slug] = data[selectField.slug]
                })
            })
            res.status(200).send(datas)
        } else {
            res.status(404).send({message: "Id topilmadi"})
        }
    } catch (e) {
        console.log(e)
        res.status(500).send({message: "Ошибка в сервере"})
    }
}

// Select page
const selPage = async (req, res) => {
    try {
        if (req.params) {
            const _id = req.params.id
            let page = await Page.findOne({_id: _id}).lean()
            console.log(req.params)
            if (page) {
                let sendName = page.name
                res.status(200).send(sendName)
            } else {
                let sendName = ''
                res.status(200).send(sendName)
            }
        } else {
            let sendName = ''
            res.status(200).send(sendName)
        }
    } catch (e) {
        console.log(e)
        res.status(500).send({message: "Ошибка в сервере"})
    }
}


// Page  yaratish
const create = async (req, res) => {
        let { name, parent, text, icon, order, fields} = req.body
        let status = 1
        if(order) order = parseInt(order)
        let isContinue = false;
        let isContinue1 = false;
        let fieldss = fields.filter(field => {
            if(field.label.length != 0 || field.slug.length != 0 ){
                return field
            }
        })

        fields.forEach(field =>{

            if(field.types == 2 && field.option.length == 0){
                isContinue = true
            }

        })

        if(isContinue || isContinue1){
            res.status(400).json({message: "Tanlov maydoniga qiymat berilmagan"})
            return
        } else {
            if (fieldss.length>0) {
                let modelName = name[0].toUpperCase() + name.slice(1);
                let page = await new Page({ name, text, icon, order, parent, status,modelName, createdAt:Date.now() })
                if (parent== '') {
                    page.parent = page._id
                }
                await page.save()
                // console.log("field", fields)

                page.fields = await Promise.all(fieldss.map( async field => {
                    let { label, types, slug, isActive, option, sort } = field
                    sort = sort || 1
                    if (sort) sort = parseInt(sort)
                    let newfield = await new Field({ page:page._id, label, types, slug, isActive, option, sort})
                    await newfield.save()
                    if (newfield.types == '2') {
                        let topPage = await Page.findOne({_id: newfield.option[0]}).lean()
                        newfield.pageModel = topPage.modelName
                    }
                    return newfield
                }))

                let findpage = await Page.findOne({_id: page._id}).lean()
                findpage.model = name.toLowerCase() + "1"
                let savePage = await Page.findByIdAndUpdate(findpage._id, findpage)
                res.status(201).json(savePage)
            } else {
                res.status(400).send({message: "To'ldirilmagan maydonlar bor"})
            }


        }

}


// Pageni taxrirlash uchun kode
const updatePage = async (req, res) => {
    if (req.params.id) {
        let _id = req.params.id
        let page = await Page.findOne({_id: _id}).lean()
        let { name, parent, text, icon, order } = req.body
        order = parseInt(order)
        let savePage = await Page.findByIdAndUpdate(_id, {name, parent, text, icon, order, updateAt:Date.now()})

        if (req.body.fields) {
            let fields = req.body.fields.filter(field => {
                if(field.label.length != 0 || field.slug.length != 0 ){
                    return field
                }
            })

            fields = await Promise.all(fields.map(async field => {
                if (field._id) {
                    let updateField = await Field.findByIdAndUpdate({_id:field._id}, field)
                    return updateField
                } else {
                    let newfield = await new Field({ page:savePage._id, label:field.label, types:field.types, slug:field.slug, isActive:field.isActive, option:field.option, sort:field.sort})
                    await newfield.save()


                    await client.connect();
                    const db = client.db('inventor');
                    const collection = db.collection(page.model);
                    let result = field.slug
                    collection.updateMany({}, {$set: {result: " "}},false,true);

                    return newfield
                }
            }))
        }
        let sendPage = await Page.findOne({_id: savePage._id}).select(['_id', 'name', 'text', 'icon'])
        res.send(sendPage)
    } else {
        res.status(400).json({message: "Id topilmadi"})
    }
}

// Biror Page mos shu pageni datalarini olib beradigan dastur
const findPage = async (req, res) => {
    try {
        if (req.params) {
            const token = req.headers.authorization.split(' ')[1]
            const decoded = jwt.verify(token, config.get('secretKey'))
            worker = await Worker.findOne({user:decoded.id}).lean()
            const id = req.params.id
            let itemId = req.query.itemId
            let page = await Page.findOne({_id:id}).lean()

            if (page) {
                let fields = await Field.find({page:page._id}).sort({sort:1}).lean()
                await client.connect();
                const db = client.db('inventor');
                const collection = db.collection(page.model)
                let obj = {}
                fields.forEach(item => {
                    if (itemId) {
                        if(item.types == '2' ){
                            obj[item.slug] = ObjectId(itemId)
                        }

                    }
                    if (req.query[item.slug]) {
                        if(item.types == '1' ){
                            obj[item.slug] =  { $regex: new RegExp( req.query[item.slug].toLowerCase(), 'i')}
                        } else {
                            obj[item.slug] =  req.query[item.slug]
                        }
                    }

                })

                let pipline = [
                    {$match : {...obj} },
                    // {"$set": {
                    //         "tipi": { $toObjectId: "$tipi"},
                    //     }
                    // },
                    // {"$lookup": {
                    //         "from": "meva1",
                    //         "localField": "tipi",
                    //         "foreignField": "_id",
                    //         "as": "pt_map",
                    //     }},
                    // {"$set": {
                    //         "pt_map": {"$first": "$pt_map"},
                    //     }},
                    // {"$set": {
                    //         "tipi": "$pt_map.name",
                    //     }},
                    // {"$unset": "pt_map"}
                ]
                fieldss = fields.filter(field => field.types == 2)

                let pipi = await Promise.all(fieldss.map(async field =>{
                    // console.log("field", field)
                    let collect = await Page.findOne({_id: field.option[0]})
                    let findFields = await Field.find({page:field.option[0]}).sort({sort:1}).lean()
                    findFields = findFields.filter(field => field.types == 1 && field.sort == 1)
                    let setElId = {"$set": {
                            [field.slug]: { $toObjectId: `$${field.slug}`},
                        }
                    }
                    pipline.push(setElId)

                    let lookEl = {"$lookup": {
                                "from": collect.model,
                                "localField": field.slug,
                                "foreignField": "_id",
                                "as": "pt_map",
                            }}
                    pipline.push(lookEl)
                    let firstSet = {"$set": {
                            "pt_map": {"$first": "$pt_map"},
                        }}
                    pipline.push(firstSet)
                    let secondSet = {"$set": {
                            [field.slug]: "$pt_map." + findFields[0].slug,
                        }}
                    pipline.push(secondSet)
                    let unsetField = {"$unset": "pt_map"}
                    pipline.push(unsetField)
                    return pipline
                }))
                let datas = await collection.aggregate(pipi[0]).toArray();

                // formula
                let forFormula = fields.filter(field => field.types == 9)
                datas = await Promise.all(datas.map(data => {
                    forFormula.forEach(item => {
                        data.natija = data.natija=null || item.option[0]
                        Object.keys(data).forEach( d =>{
                            if(item.option[0].includes(d)){
                                let count = item.option[0].split(d).length - 1
                                for(i=0; i<count; i++){
                                    data.natija = data.natija.replace(d, data[d])
                                }
                            }
                        })
                        data[item.slug] = eval(data.natija)
                        data[item.slug] = data[item.slug].toLocaleString('fr', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })
                    })
                    return data
                }))

                let sendPage = {
                    fields: fields,
                    datas:datas,
                    count: datas.length,
                    title: page.name,
                    text: page.text
                }
                sendPage.oper = {}
                sendPage.role = 0
                if (worker) {
                    sendPage.role = 1
                    // console.log("sorker", worker)
                    worker.list = await Promise.all(worker.list.map(async item => {
                        console.log(item)
                        if (id == item.selectId) {
                            item.operations.includes('add') ? sendPage.oper.add = true : sendPage.oper.add = false
                            item.operations.includes('edit') ? sendPage.oper.edit = true : sendPage.oper.edit = false
                            item.operations.includes('del') ? sendPage.oper.del = true : sendPage.oper.del = false
                        }

                    }))
                }
                // console.log("future",sendPage)
                res.status(200).json(sendPage)
            } else {
                res.json({message: "Page id topilmadi"})
            }
        }
    } catch (e) {
        console.log(e)
        res.send({message: "Serverda xatolik"})
    }
}

// Pageni childni uchun fieldsdagi nomini yuborish
const getPage = async (req, res) => {
    try {
        if (req.params) {
            const _id = req.params.id
            if (_id) {
                let page = await Page.findOne({_id:_id}).lean()
                let fields = await Field.find({page:page._id}).sort({sort:1}).lean()
                let sendSlug = ''
                fields.forEach(item => {
                    if (item.types == '1') {
                        sendSlug = item.slug
                    }
                })
                res.status(200).json(sendSlug)
            }
        }
    } catch (e) {
        console.log(e)
        res.send({message: "Serverda xatolik"})
    }
}

// Bitta pageni olish userlar uchun
const getOnePage = async (req, res) => {
    try {
        if (req.params.id) {
            const _id = req.params.id
            if (_id) {
                let page = await Page.findOne({_id}).lean()
                res.status(200).json(page)
            } else {
                res.send({message: "Id topilmadi"})
            }
        } else {
            res.send({message: "Id topilmadi"})
        }
    } catch (e) {
        console.log(e)
        res.send({message: "Serverda xatolik"})
    }
}


// page edit uchun page va filedlarini olish
const editPage = async(req,res)=>{
    try {
        let _id = req.params.id
        if (_id) {
            let page = await Page.findOne({_id}).lean()
            let fields = await Field.find({page:_id}).sort({sort:1}).lean()
            page.fields = fields
            res.status(200).json(page)
        } else {
            res.status(500).send({message: "Не найдено"})
        }
    } catch (e) {
        console.log(e)
        res.send({message: "Ошибка в сервере"})
    }
}


// Delete page
const del = async(req,res)=>{
    try {
        let _id = req.params.id
        if (_id) {
            let page = await Page.findOne({_id:_id}).lean()
            let fields = await Field.find({page:page._id}).lean()
            await client.connect();
            const db = client.db('inventor');
            const collection = db.collection(page.model)
            let datas = await collection.find().toArray()
            let delData = page.model
            console.log("delDatas",datas)
            // db.delData.deleteMany({})
            datas.forEach(async data => {
                db.delData.deleteOne( { "_id" : ObjectId(data._id) } )
                // await PageModel.findByIdAndDelete({_id:data._id})
            })
            fields.forEach(async field => {
                await Field.findByIdAndDelete({_id: field._id})
            })
            await Page.findByIdAndDelete({_id:page._id})
            res.status(201).send({message:'Удалено!', data: _id})
        } else {
            res.status(500).send({message: "Не найдено"})
        }
    } catch (e) {
        console.log(e)
        res.send({message: "Ошибка в сервере"})
    }
}


// Pagega biriktirilgan fieldslarni uchirish
const delField = async (req, res) => {
    if (req.params.id) {
        let _id = req.params.id
        let fieldId = req.query.fieldId
        if (fieldId) {
            let page = await Page.findOne({_id:_id}).lean()
            let findField = await Field.findOne({_id:fieldId}).lean()

            let allField = await Field.find({page:_id}).lean()
            allField = allField.filter(field => field.types == 9)
            const db = client.db('inventor');
            const collection = db.collection(page.model);
            let datas = await collection.find().toArray();
            if (findField) {
                if ( findField.types != 10 || allField.length == 0) {
                    datas = await Promise.all(datas.map(async data => {
                        await delete data[findField.slug]
                        let updata =  await collection.updateOne({ _id: ObjectId(data._id) }, { $set: data}).then(async ()=>{
                            return await collection.find({_id: ObjectId(data._id)}).toArray()
                        });
                        return data
                    }))

                    await Field.findByIdAndDelete({_id:fieldId})
                    res.send(_id)
                } else {
                    allField.forEach(async item => {
                        let forIndex = item.option[0]
                        let natija = forIndex.indexOf(findField.slug);
                        if (natija == -1) {
                            datas = await Promise.all(datas.map(async data => {
                                delete data[findField.slug]
                                await collection.updateOne({ _id: ObjectId(data._id) }, { $set: data}).then(async ()=>{
                                    return await collection.find({_id: ObjectId(data._id)}).toArray()
                                });
                                return data
                            }))
                            await Field.findByIdAndDelete({_id:fieldId})
                            res.send(_id)

                        } else {
                            res.status(400).json({message: "Sizda bu maydonga boglangan formula maydoni bor."})
                        }
                    })
                }
            }
        } else {
            res.status(200).json({message: "Id topilmadi"})
        }

    } else {
        res.status(400).json({message: "Id topilmadi"})
    }
}

// file path create
const createFile = async  (req,res) =>{
    try{
        if (req.files) {
            let file = req.files.file
            uniquePreffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
            filepath = `files/${uniquePreffix}_${file.name}`
            await file.mv(filepath)
            res.status(200).send(filepath)
        }
    } catch (e){
        console.log(e)
        res.send({message: "Ошибка в сервере"})
    }
}



//  DATA lar uchun

// pageni ichidagi maydonga qarab (data) valuelarini yaratish
const createTable = async (req, res) => {
    try {
        if (req.params) {
            const _id = req.params.id
            let page = await Page.findOne({_id: _id}).lean()
            let fields = await Field.find({page:page._id}).lean()
            // let PageData = require(`../models/${page.model}`);

            req.body.page = page._id;
            await client.connect();
            const db = client.db('inventor');
            const collection = db.collection(page.model);
            let newData = await  collection.insertOne(req.body)

            let pipline = [
                // {$match : {_id: newData.insertedId} }
                // {"$set": {
                //         "tipi": { $toObjectId: "$tipi"},
                //     }
                // },
                // {"$lookup": {
                //         "from": "meva1",
                //         "localField": "tipi",
                //         "foreignField": "_id",
                //         "as": "pt_map",
                //     }},
                // {"$set": {
                //         "pt_map": {"$first": "$pt_map"},
                //     }},
                // {"$set": {
                //         "tipi": "$pt_map.name",
                //     }},
                // {"$unset": "pt_map"}
            ]

            fieldss = fields.filter(field => field.types == 2)

            let pipi = await Promise.all(fieldss.map(async field =>{
                let collect = await Page.findOne({_id: field.option[0]})
                let findFields = await Field.find({page:field.option[0]}).sort({sort:1}).lean()
                findFields = findFields.filter(field => field.types == 1 && field.sort == 1)

                let setElId = {"$set": {
                        [field.slug]: { $toObjectId: `$${field.slug}`},
                    }
                }
                pipline.push(setElId)

                let lookEl = {"$lookup": {
                        "from": collect.model,
                        "localField": field.slug,
                        "foreignField": "_id",
                        "as": "pt_map",
                    }}
                pipline.push(lookEl)
                let firstSet = {"$set": {
                        "pt_map": {"$first": "$pt_map"},
                    }}
                pipline.push(firstSet)
                let secondSet = {"$set": {
                        [field.slug]: "$pt_map." + findFields[0].slug,
                    }}
                pipline.push(secondSet)
                let unsetField = {"$unset": "pt_map"}
                pipline.push(unsetField)
                console.log(pipline, 'bu pipiline')
                return pipline
            }))

            let data = await collection.aggregate(pipi[0]).toArray();
            data = data[data.length-1]
            //formula
            let forFormula = fields.filter(field => field.types == 9)
            forFormula.forEach(item => {
                Object.keys(data).forEach(d =>{
                    data.natija = data.natija || item.option[0]
                    if(item.option[0].includes(d)){
                        let count = item.option[0].split(d).length - 1
                        for(i=0; i<count; i++){
                            data.natija = data.natija.replace(d, data[d])
                        }
                    }
                })
                data.natija= null
                data[item.slug] = eval(data.natija)
            })
            res.send(data)
        } else {
            res.status(404).send({message: "Id topilmadi"})
        }
    } catch (e) {
        console.log(e)
        res.status(500).send({message: "Ошибка в сервере"})
    }
}



// pageni ichidagi datalardan bittasini uchirish
const getOneDelete = async (req, res) => {
    try {
        if (req.params) {
            const _id = req.params.routeId
            const data = req.params.itemId
            if (_id) {
                let page = await Page.findOne({_id}).lean()
                await client.connect();
                const db = client.db('inventor');
                const collection = db.collection(page.model);
                let fields = await Field.find({page:_id}).lean()
                let fieldss = fields.filter(field => field.types == 8)
                if (fieldss) {
                    fieldss.forEach(async field => {
                        let delData = await collection.findOne({_id: data});
                        let delFiles = delData[field.slug][0].response
                        if (fs.existsSync(delFiles)) {
                            fs.unlinkSync(delFiles)
                        }
                    })
                }
                await collection.deleteOne({"_id": ObjectId(data)});
                res.status(200).json(data)
            }
        }
    } catch (e) {
        console.log(e)
        res.send({message: "Serverda xatolik"})
    }
}



// pageni ichidagi datalardan bittasini uzgartirish
const getOneUpdate = async (req, res) => {
    if (req.params) {
        const _id = req.params.routeId
        const item = req.params.itemId
        if (_id) {
            let page = await Page.findOne({_id: _id}).lean()
            let fields = await Field.find({page:page._id}).lean()
            let reqData = await Field.find({page:page._id}).then(fields=>{
                let obj = {}
                fields.forEach(i =>{
                    obj[i.slug]= req.body[i.slug]
                })
                return obj
            })
            await client.connect();
            const db = client.db('inventor');
            const collection = db.collection(page.model);

            let saveData =  await collection.updateOne({ _id: ObjectId(item) }, { $set: reqData}).then(async ()=>{
                return await collection.find({_id: ObjectId(item)}).toArray()
            });

            let pipline = [
                {$match : {_id: saveData[0]._id} },
                // {"$set": {
                //         "tipi": { $toObjectId: "$tipi"},
                //     }
                // },
                // {"$lookup": {
                //         "from": "meva1",
                //         "localField": "tipi",
                //         "foreignField": "_id",
                //         "as": "pt_map",
                //     }},
                // {"$set": {
                //         "pt_map": {"$first": "$pt_map"},
                //     }},
                // {"$set": {
                //         "tipi": "$pt_map.name",
                //     }},
                // {"$unset": "pt_map"}
            ]

            fieldss = fields.filter(field => field.types == 2)

            let pipi = await Promise.all(fieldss.map(async field =>{
                let collect = await Page.findOne({_id: field.option[0]})
                let findFields = await Field.find({page:field.option[0]}).sort({sort:1}).lean()
                findFields = findFields.filter(field => field.types == 1 && field.sort == 1)

                let setElId = {"$set": {
                        [field.slug]: { $toObjectId: `$${field.slug}`},
                    }
                }
                pipline.push(setElId)

                let lookEl = {"$lookup": {
                        "from": collect.model,
                        "localField": field.slug,
                        "foreignField": "_id",
                        "as": "pt_map",
                    }}
                pipline.push(lookEl)
                let firstSet = {"$set": {
                        "pt_map": {"$first": "$pt_map"},
                    }}
                pipline.push(firstSet)
                let secondSet = {"$set": {
                        [field.slug]: "$pt_map." + findFields[0].slug,
                    }}
                pipline.push(secondSet)
                let unsetField = {"$unset": "pt_map"}
                pipline.push(unsetField)
                return pipline
            }))

            let data = await collection.aggregate(pipi[0]).toArray();

            // formula
            let forFormula = fields.filter(field => field.types == 9)
            forFormula.forEach(item => {
                Object.keys(data[0]).forEach(d =>{
                    data[0].natija = data[0].natija=null || item.option[0]
                    if(item.option[0].includes(d)){
                        let count = item.option[0].split(d).length - 1
                        for(i=0; i<count; i++){
                            data[0].natija = data[0].natija.replace(d, data[0][d])
                        }
                    }
                })
                data[0][item.slug] = eval(data[0].natija)
            })

            res.status(200).json(data[0])
        }
    }
}

// pageni ichidagi datalaridan bittasini olish
const getOneEdit = async (req, res) => {
    try {
        if (req.params) {
            const _id = req.params.routeId
            const data = req.params.itemId

            if (_id) {
                let page = await Page.findOne({_id}).lean()
                await client.connect();
                const db = client.db('inventor');
                const collection = db.collection(page.model);
                let dataModel = await collection.find({_id: ObjectId(data)}).toArray();
                res.status(200).json(dataModel[0])
            } else {
                res.send({message: "Id topilmadi"})
            }
        }
    } catch (e) {
        console.log(e)
        res.send({message: "Serverda xatolik"})
    }
}


// Datalarni Excelga chiqarish

const toExcell = async (req, res) => {
    try {
        const id = req.params.id;
        let itemId = req.query.itemId
        let page = await Page.findOne({_id:id}).lean()
        await client.connect();
        const db = client.db('inventor');
        const collection = db.collection(page.model)
        let fields = await Field.find({page:page._id}).sort({sort:1}).lean()
        // for filter
        let obj = {}
        fields.forEach(item => {
            if (itemId) {
                if(item.types == '2' ){
                    obj[item.slug] = ObjectId(itemId)
                }

            }
            if (req.query[item.slug]) {
                if(item.types == '1' ){
                    obj[item.slug] =  { $regex: new RegExp( req.query[item.slug].toLowerCase(), 'i')}
                } else {
                    obj[item.slug] =  req.query[item.slug]
                }
            }
        })

        let pipline = [
            {$match : {...obj} },
            // {"$set": {
            //         "tipi": { $toObjectId: "$tipi"},
            //     }
            // },
            // {"$lookup": {
            //         "from": "meva1",
            //         "localField": "tipi",
            //         "foreignField": "_id",
            //         "as": "pt_map",
            //     }},
            // {"$set": {
            //         "pt_map": {"$first": "$pt_map"},
            //     }},
            // {"$set": {
            //         "tipi": "$pt_map.name",
            //     }},
            // {"$unset": "pt_map"}
        ]
        fieldss = fields.filter(field => field.types == 2)
        let pipi = await Promise.all(fieldss.map(async field =>{
            let collect = await Page.findOne({_id: field.option[0]})
            let findFields = await Field.find({page:field.option[0]}).sort({sort:1}).lean()
            findFields = findFields.filter(field => field.types == 1 && field.sort == 1)

            let setElId = {"$set": {
                    [field.slug]: { $toObjectId: `$${field.slug}`},
                }
            }
            pipline.push(setElId)

            let lookEl = {"$lookup": {
                    "from": collect.model,
                    "localField": field.slug,
                    "foreignField": "_id",
                    "as": "pt_map",
                }}
            pipline.push(lookEl)
            let firstSet = {"$set": {
                    "pt_map": {"$first": "$pt_map"},
                }}
            pipline.push(firstSet)
            let secondSet = {"$set": {
                    [field.slug]: "$pt_map." + findFields[0].slug,
                }}
            pipline.push(secondSet)
            let unsetField = {"$unset": "pt_map"}
            pipline.push(unsetField)
            return pipline
        }))
        let datas = await collection.aggregate(pipi[0]).toArray()

        // formula
        let forFormula = fields.filter(field => field.types == 9)
        datas = await Promise.all(datas.map(data => {
            forFormula.forEach(item => {
                Object.keys(data).forEach(d =>{
                    data.natija = data.natija || item.option[0]
                    if(item.option[0].includes(d)){
                        let count = item.option[0].split(d).length - 1
                        for(i=0; i<count; i++){
                            data.natija = data.natija.replace(d, data[d])
                        }
                    }
                })
                data[item.slug] = eval(data.natija)
            })
            return data
        }))
        let excel = []
        fields.forEach(async field => {
            let obj = {
                header: field.slug,
                key: field.slug,
                width: 32
            }
            excel.push(obj)

        })
        let headNum = {header: 'N', key: 'id', width: 10}
        excel.unshift(headNum)
        // console.log("excel", excel)
        const workbook = new ExcellJs.Workbook()
        const worksheet = workbook.addWorksheet('My Document');
        worksheet.columns = excel;

        datas.forEach((data, index) => {
            let d = {}
            d.id = index + 1
            fields.forEach(async field => {
                if (field.types == '5') {
                    d[field.slug] = data[field.slug]? 'true' : 'false'
                } else if (field.types == '2') {
                    d[field.slug] = data[field.slug]
                } else {
                    d[field.slug] = data[field.slug]
                }
            })
            worksheet.addRow(d)
        })
        worksheet.getRow(1).eachCell((cell)=> {
            cell.font = {bold: true};
        });
        let filename = path.join(__dirname, '../files/excel', 'document.xlsx')
        await workbook.xlsx.writeFile(filename)
        res.status(200).send("files/excel/document.xlsx")

    } catch (e) {
        console.log(e)
        res.send({message: "Serverda xatolik"})
    }
}





module.exports = { getPages, getPageName, getQueryPage, getSelectPages, create, updatePage, findPage, getPage, getOnePage, editPage, del, delField, createFile, createTable, getOneUpdate, getOneEdit, getOneDelete, toExcell, selPage }





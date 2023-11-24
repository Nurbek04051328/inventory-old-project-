const {Schema, model} = require("mongoose");


const Page = new Schema({
    name: {
        type: String,
        required: true,
    },
    text: String,
    parent: Schema.Types.ObjectId,
    icon: String,
    order:{
        type: Number,
        default: 1
    },
    model: String,
    modelName: String,
    createdAt:Date,
    updateAt:Date,
    status: {
        type: Number,
        default:0
    },
})

module.exports = model("Page", Page)
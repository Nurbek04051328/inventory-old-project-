const {Schema, model} = require("mongoose");


const Worker = new Schema({
    user: {
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    name:String,
    lname:String,
    sname:String,
    phone:String,
    list:Array,
    createdAt:Date,
    lastseans: Date,
    updateAt:Date,
    status: Number,
})

module.exports = model("Worker", Worker)
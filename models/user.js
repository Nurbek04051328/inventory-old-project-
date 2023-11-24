const {Schema, model} = require("mongoose");

const User = new Schema({
    login: {
        type: String, 
        required: true, 
        unique: true
    },
    password: {
        type: String, 
        required: true
    },
    name: {
        type: String,
    },
    avatar: {
        type: String
    },
    role:Number
})

module.exports = model("User", User)
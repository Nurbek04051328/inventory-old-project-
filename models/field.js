const {Schema, model} = require("mongoose");


const Field = new Schema({
    page: {
        type:Schema.Types.ObjectId,
        ref:"Page"
    },
    label: String,//
    types: Number,//
    slug: String,//
    option: Array,
    isActive: Boolean,//
    sort: Number,
    // selectId: String,//
    // radioVal: Array,//
    // checkVal: Array,//
    // swichVal: Boolean,
    // areaVal: String,
    // dateVal: String,
    // formula: String,
    // place: String,
})

// types
// 1 input -> slug 11
// 2 select -> slug, selectId
// 3 radio -> radioVal  33
// 4 checkbox -> checkVal 33
// 5 switch  -> swichVal
// 6 textarea -> areaVal 11
// 7 data  -> dateVal
// 8 file -> fileupload
// 9 formula -> formula 11
// 10 inputnumber -> slug

module.exports = model("Field", Field)
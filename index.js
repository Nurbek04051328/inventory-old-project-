const express = require('express');
const mongoose = require('mongoose');
const config = require('config');
const cors = require('cors')
const fileUpload = require('express-fileupload')

// Routers
const routerList = require('./router.js')

const app = express();
const PORT = config.get('serverPort') || 3001;


app.use(express.json());
app.use(cors())
app.use(fileUpload({
    abortOnLimit: true
}));
app.use('/files',express.static('files'))
app.use(routerList)

const start = async ()=> {
    try {
        await mongoose.connect(config.get("MONGODB_URI"))

        app.listen(PORT, () => {
            console.log(`Server ${PORT} da ishga tushdi`)
        })
    } catch (e) {
        console.log(e)
    }
}

start()
const Router = require("express");
const router = new Router();
const auth = require('../middleware/auth');
const { getPages, getPageName, getQueryPage, getSelectPages, create, updatePage, findPage, getPage, getOnePage, editPage, del, delField, createFile, createTable, getOneUpdate, getOneEdit, getOneDelete, toExcell, selPage } = require('../controllers/page');

// Pagelarni Foydalanuvchiga qarab olib berish
router.get('/', auth, getPages);

// Page  yaratish
router.post("/", auth, create);

// Pageni amiga qarab bu nomdagi page bor yuqligiga tekshiradi
router.get("/checkname", auth, getPageName);


// Delete one Fields
router.get("/delfield/:id", delField);

// page edit uchun page va filedlarini olish
router.get("/:id", auth, editPage);

// pageni uzgartirilganni saqlash
router.put("/:id", auth, updatePage);

// Pageni yaratishda oxirida select field busa shuni qaytaradi
router.get("/change/:id", auth, selPage);

//Pageni fieldsida file yaratish
router.post("/files", createFile);

// pageni ichidagi maydonga qarab valuelarini yaratish
router.post("/table/:id", auth, createTable);

// Biror Page mos shu pageni datalarini olib beradi
router.get("/find/:id", auth, findPage);

// Ichma ich childga kirganda aynan shu otasiga tegishli childlarni olib beradi
router.get("/getchild/:id", auth, getQueryPage);

// Childidagi selectdagini tanlash uchun
router.get('/option/:id', auth, getSelectPages);

// Bitta pageni olish userlar uchun
router.get("/getone/:id", auth, getOnePage );

// Pageni childni uchun fieldsdagi nomini yuborish
router.get("/fields/:id", auth, getPage );

// Ma'lumotlarni excelga chiqarish uchun
router.get('/toexcel/:id', toExcell);

// pageni ichidagi datalaridan bittasini olish
router.get("/edit/:routeId/:itemId", auth, getOneEdit );

// pageni ichidagi datalardan bittasini uzgartirish
router.put("/update/:routeId/:itemId", auth, getOneUpdate );

// pageni ichidagi datalardan bittasini uchirish
router.delete("/delete/:routeId/:itemId", auth, getOneDelete );

// Delete page
router.delete('/:id', auth, del);








// router.put('/:id', auth, update);

// router.get('/', auth, getTablePages);

// router.get("/:id", auth, findTablePage);
//
// router.put('/:id', auth, update);

// router.delete('/:id', auth, del);


module.exports = router;
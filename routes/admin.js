var express = require('express');
var router = express.Router();
var helpers = require('../helpers/product-add')
var objectId = require('mongodb').ObjectId

/* GET users listing. */
router.get('/', function (req, res, next) {
  helpers.getAllProduct().then((products) => {
    console.log(products);
    res.render('admin/view-product', { admin: true, products })
  })


});
router.get('/add-product', function (req, res) {
  res.render('admin/add-product')
})
router.post('/add-product', function (req, res) {
  console.log(req.body)
  console.log(req.files.Image);

  helpers.addProduct(req.body, (id) => {
    let image = req.files.Image
    console.log(id);
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) {

        res.render("admin/add-product")

      }
      else {
        console.log(err)
      }
    })

  })

})

router.get('/delete-product/', (req, res) => {
  let proid = req.query.id
  console.log(proid)
  helpers.deleteProduct(proid).then((response) => {
    res.redirect('/admin/')
  })
})
router.get('/edit-product/', async (req, res) => {
  let Product = await helpers.getProductDetails(req.query.id)
  console.log(Product)

  res.render('admin/edit-product', { Product })
})


router.post('/edit-product/', function (req, res) {
  console.log(req.query.id)
  let id = req.query.id
  helpers.updateProduct(req.query.id, req.body).then(() => {
    res.redirect('/admin') 
    if (req.files.Image) {
      let image = req.files.Image

      image.mv('./public/product-images/' + id + '.jpg')
    }

  })
})




module.exports = router;

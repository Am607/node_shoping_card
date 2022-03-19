var express = require('express');
var router = express.Router();
var productBackend = require('../helpers/product-add')
var loginBackend = require('../helpers/login-backend');
const { response } = require('../app');
const { log } = require('debug');
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartCount = null
  if (req.session.user) {
    cartCount = await loginBackend.getCartCount(req.session.user._id)
  }

  productBackend.getAllProduct().then((products) => {
    //  console.log(products);
    res.render('user/viewproduct', { admin: false, products, user, cartCount })
  })


});

router.get("/login", function (req, res) {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/login', { "loginErr": req.session.loginErr })
    req.session.loginErr = false
  }

});

router.get("/signup", function (req, res) {
  res.render('user/signup')
})

router.post('/signup', (req, res) => {
  //console.log(req.body)
  loginBackend.doSignup(req.body).then((response) => {
    console.log(response);
    req.session.loggedIn = true
    req.session.user = response
    res.redirect('/')

  })

})
router.post('/login', (req, res) => {
  //  console.log(req.body)
  loginBackend.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true
      req.session.user = response.user
      res.redirect('/')
    } else {
      req.session.loginErr = "invalid user name or password"
      res.redirect('/login')
    }
  })


})

router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/',)

})
router.get("/cart", verifyLogin, async (req, res) => {
  let products = await loginBackend.getCartProducts(req.session.user._id)
  let totalPrice = await loginBackend.getTotalAmount(req.session.user._id)
  // console.log(products)
  //  console.log(req.session.user._id)
  res.render('user/cart', { products, user: req.session.user._id, totalPrice })
})

router.get('/add-to-cart/:id', (req, res) => {
  //console.log('api calling'); 
  let id = req.params.id
  //  console.log(id)
  loginBackend.addToCart(id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
})
router.post('/change-product-quantity', (req, res, next) => {
  //console.log(req.body)
  loginBackend.changeProductQuantity(req.body).then(async (response) => {
    response.total = await loginBackend.getTotalAmount(req.body.user)
    res.json(response)

  })
})
router.get('/place-order', verifyLogin, async (req, res) => {

  let total = await loginBackend.getTotalAmount(req.session.user._id)


  res.render('user/order', { total, user: req.session.user })
}),
  router.post('/place-order', verifyLogin, async (req, res) => {
    // console.log(req.body)
    let products = await loginBackend.getCartParoductList(req.body.userId)
    //    console.log(req.body.userId)
    let totalPrice = 0
    if (products.length > 0) {
      totalPrice = await loginBackend.getTotalAmount(req.body.userId)
    }


    loginBackend.placeOrder(req.body, products, totalPrice).then((orderId) => {

      //   console.log(orderId);
      console.log("a" + req.body['payment-method'])
      if (req.body['payment-method'] === 'COD') {
        res.json({ codStatus: true })
      } else {
        loginBackend.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response)
        })
      }

    })


    //  console.log(req.body);
    //  console.log('working')
  })


router.get("/order-success", function (req, res) {
  res.render('user/order-success', { user: req.session.user })
})
router.get("/orders", verifyLogin, async function (req, res) {
  let user = req.session.user
  let orders = await loginBackend.getUserOrders(user._id)
  let products = await loginBackend.getOrderProduct(orders._id)
  // console.log(orders)

  res.render('user/orders', { user: req.session.user, orders, products })
  // console.log(user._id)

})
router.get("/view-order-products/:id", verifyLogin, async function (req, res) {
  // console.log(req.params.id)
  let products = await loginBackend.getOrderProduct(req.params.id)
  res.render('user/view-oder-products', { products })
  // console.log(products);
})


router.post('/verify-payment', (req, res,) => {
  console.log(req.body)
  loginBackend.verfifyPayment(req.body).then(() => {
    loginBackend.changePaymentStatus(req.body['order[receipt]']).then(() => {
      res.json({ status: true })
    })
  }).catch((err) => {
    res.json({ status: false, errMag: '' })
  })


})

module.exports = router;

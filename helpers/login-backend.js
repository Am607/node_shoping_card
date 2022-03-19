var db = require('../config/connection')
var constants = require('../config/constants')
const bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectId
const { response } = require('express')
const Razorpay = require('razorpay')
var instance = new Razorpay({
    key_id: 'rzp_test_4DCxbBR8lYcF3C',
    key_secret: 'VmvPjJ8dP7kPFc9xzsxEG83W',
});

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, recject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(constants.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.ops[0])
            })



        })

    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(constants.USER_COLLECTION).findOne({ Email: userData.Email })

            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log('login success');
                        response.user = user
                        response.status = true
                        resolve(response)

                    } else {
                        console.log('login Failed')
                        resolve({ status: false })
                    }

                })
            } else {
                console.log('login failed');
                resolve({ status: false })
            }
        })
    },

    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let usercart = await db.get().collection(constants.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (usercart) {
                let proExit = usercart.products.findIndex(product => product.item == proId)
                console.log(proExit)
                if (proExit != -1) {
                    db.get().collection(constants.CART_COLLECTION).updateOne(
                        {
                            user: objectId(userId),
                            'products.item': objectId(proId)
                        },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }
                    ).then(() => {
                        resolve()
                    })
                } else {
                    db.get().collection(constants.CART_COLLECTION)
                        .updateOne({ user: objectId(userId) },
                            {
                                $push: { products: proObj }
                            }).then((response) => {
                                resolve()
                            })
                }
            }

            else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(constants.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })

            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(constants.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: constants.PRODUCT_COLLECTION,
                        localField: "item",
                        foreignField: "_id",
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }

                    }
                }

            ]).toArray()
            //  console.log(cartItems[0].product)
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(constants.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },

    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.quantity == 1 && details.count == -1) {
                db.get().collection(constants.CART_COLLECTION).updateOne(
                    { _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }
                    }
                ).then(() => {
                    console.log(details.count)
                    resolve({ removeProduct: true })
                })
            } else {
                db.get().collection(constants.CART_COLLECTION).updateOne(
                    {
                        _id: objectId(details.cart),
                        'products.item': objectId(details.product)
                    },
                    {
                        $inc: { 'products.$.quantity': details.count }
                    }
                ).then((response) => {

                    resolve({ status: true })
                })
            }


        })
    },

    //7034561333 airtel port shiflih

    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(constants.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: constants.PRODUCT_COLLECTION,
                        localField: "item",
                        foreignField: "_id",
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }

                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.Price' }] } }
                    }
                }


            ]).toArray()

            if (total[0] == undefined) {
                resolve(0)
            } else {
                resolve(total[0].total)
            }
             console.log(total[0])


        }
        )

    },

    getCartParoductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            console.log(userId)
            let cart = await db.get().collection(constants.CART_COLLECTION).findOne({ user: objectId(userId) })
            //  console.log(cart)
            resolve(cart.products)
        })


    },
    placeOrder: (order, products, total) => {
        return new Promise(async (resolve, reject) => {
            //   console.log(order, products, total)
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'

            let orderObject = {
                deliveryDetails: {
                    address: order.address,
                    mobile: order.mobile,
                    picode: order.picode,
                },
                userid: objectId(order.userId),
                paymentmethod: order['payment-method'],
                status: status,
                time: new Date(),
                product: products,
                getTotalAmount: total,
            }
            db.get().collection(constants.ORDER_COLLECTION).insertOne(orderObject).then((response) => {
                db.get().collection(constants.CART_COLLECTION).removeOne({ user: objectId(order.userId) })
                resolve(response.ops[0]._id)
            })

        })
    },
    getUserOrders: (userId) => {
        //  console.log(userId)
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(constants.ORDER_COLLECTION).find({ userid: objectId(userId) }).toArray()
            resolve(orders)
            //  console.log(orders)
        })
    },
    getOrderProduct: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(constants.ORDER_COLLECTION).aggregate(
                [
                    {
                        $match: { _id: objectId(orderId) }

                    },
                    {
                        $unwind: '$product',
                    }
                    ,
                    {
                        $project: {
                            item: '$product.item',
                            quantity: '$product.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: constants.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'products'
                        }
                    },
                    {
                        $project: {
                            item: 1,
                            quantity: 1,
                            products: { $arrayElemAt: ['$products', 0] }
                        }
                    }
                ]
            ).toArray()
            resolve(orderItems)
            console.log(orderItems)
        })
    },
    generateRazorpay: (orderId, amount) => {
        // console.log(orderId+"asd12")
        return new Promise((resolve, reject) => {
            var options = {
                amount: amount * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err)
                } else {
                    console.log("New : Order", order);
                    resolve(order)
                }

            });
        })

    },
    verfifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'VmvPjJ8dP7kPFc9xzsxEG83W');
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        }
        )
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            console.log(orderId + " yes");
            db.get().collection(constants.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'placed'
                    }
                }
            ).then(() => {
                resolve()
            })

        })
    }


}
var db = require('../config/connection')
var constants = require('../config/constants')
var objectId = require('mongodb').ObjectId

module.exports = {

    addProduct: (product, callback) => {
        console.log(product);
        db.get().collection('product').insertOne(product).then((data) => {
            callback(data.ops[0]._id)

        })
    },
    getAllProduct: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(constants.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },

    deleteProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            console.log(prodId);
            console.log(objectId(prodId));
            db.get().collection(constants.PRODUCT_COLLECTION).removeOne({ _id: objectId(prodId) }).
                then((response) => {
                    resolve(response)
                })
        })
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(constants.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).
                then((product) => {
                    resolve(product)

                })
        })
    },

    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(constants.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
                $set: {
                    Name: proDetails.Name,
                    Description: proDetails.Description,
                    Price: proDetails.Price,
                    Category: proDetails.Category
                }
            }).
                then((product) => {
                    resolve()

                })
        })
    }


} 
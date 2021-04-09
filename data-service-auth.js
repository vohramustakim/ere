const bcrypt = require('bcryptjs');
var mongoose = require("mongoose");
const { getEmployeesByDepartment } = require("./data-service");
var Schema = mongoose.Schema;
var userSchema = new Schema({
  "userName":{
      "type": String,
      "unique": true
  },
  "password": String,
  "email": String,
  "loginHistory": [{
      "dateTime": Date,
      "userAgent": String
  }]
});

let User;

var exports = module.exports = {};

exports.initialize = function(){
    return new Promise((resolve, reject) =>{
        let db = mongoose.createConnection("mongodb+srv://webapp:<mvohra5>@cluster0.9i8jw.mongodb.net/web322_a5?retryWrites=true&w=majority");

        db.on('error', (err)=>{
            reject(err); // reject the promise with the provided error
        });
        db.once('open', ()=>{
           User = db.model("users", userSchema);
           resolve();
        });
    });
};

exports.registerUser = function(userData){
    return new Promise((resolve, reject) => {
        if(userData.password != userData.password2){
            reject("Passwords do not match");
        }
        else{
            let newUser = new User(userData);
            bcrypt.genSalt(10, function(err, salt){
                bcrypt.hash(userData.password, salt, function(err, hash){
                    if(err){
                        reject("There was an error encrypting the password");
                    }
                    else{
                        newUser.password = hash;
                        newUser.save()
                        .then(()=>{
                            resolve();
                        })
                        .catch((err)=>{
                            if(err.code == 11000){
                                reject("User Name already taken");
                            }
                            else{
                            reject("There was an error creating the user: " + err);
                            }
                        });
                    }
                });
            });
        }
    });
};

exports.checkUser = function(userData){
    return new Promise((resolve, reject) =>{
        User.find({ userName: userData.userName })
        .exec()
        .then((users) =>{
            if(!users){
                reject("Unable to find user: " + userData.userName);
            }
            else{
                bcrypt.compare(userData.password, users[0].password).then((res)=>{
                    if(!res){
                        reject("Incorrect Password for user: " + userData.userName);
                    }
                    else{
                        users[0].loginHistory.push({dateTime: (new Date()).toString(), userAgent: userData.userAgent});
                        User.update(
                            {userName: users[0].userName},
                            {$set: {loginHistory: users[0].loginHistory}},
                        )
                        .exec()
                        .then((()=>{
                            resolve(users[0]);
                        }))
                        .catch((err)=>{
                            reject("There was an error verifying the user: " + err);
                        });
                    }
                });
            }
        }).catch(()=>{
            reject("Unable to find user: " + userData.userName);
        });
    });
};
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    firstName:{type: String, required:true, max:[50,"Max length is 50 chars."]},
    lastName:{type: String, required:true, max:[50,"Max length is 50 chars."]},
    email:{type: String, required:true, unique:true, dropDups: true, max:[50,"Max length is 50 chars."]},
    passwordHash:{type: String, required:true},
    blogs:Array     
},{timestamps:true});

const User = mongoose.model('User', userSchema);
module.exports = User; 
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');

const blogSchema = new Schema({ 
    title:{type: String, required:true, max:[300,"Max length is 300 chars."]},
    summary:{type: String, required:true, max:[200,"Max length is 200 chars."]},
    body:{type: String, required:true},
    createdBy:{type:String, required:true}
},{timestamps:true});
blogSchema.plugin(mongoosePaginate);
blogSchema.index({summary:"text"});
const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;
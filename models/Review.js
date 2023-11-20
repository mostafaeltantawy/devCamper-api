const { default: mongoose } = require('mongoose');
const momgoose = require('mongoose');
const ReviewSchema = new momgoose.Schema({
  title: {
    type: String,
    trim: true,
    required: [true, 'please add a title for a review '],
    maxlength: 100,
  },
  text: {
    type: String,
    required: [true, 'Please  add some  text '],
  },
  rating: {
    type: Number,
    required: [true, 'Please  add a number between 1 => 10 '],
    min: 1,
    max: 10,
  },

  createdAt: {
    type: Date,
    default: Date.now(),
  },
  bootcamp: {
    type: momgoose.Schema.Types.ObjectId,
    ref: 'Bootcamp',
    required: true,
  },
  user: {
    type: momgoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

//Prevent user from submetting more than one review for bootcamp

ReviewSchema.index({ bootcamp: 1, user: 1 }, { unique: true });

//Static method to get average of rating and save
ReviewSchema.statics.getAverageRating = async function (bootcampId) {
  const obj = await this.aggregate([
    {
      $match: { bootcamp: bootcampId },
    },
    {
      $group: {
        _id: '$bootcamp',
        averageRating: { $avg: '$rating' },
      },
    },
  ]);
  try {
    await this.model('Bootcamp').findByIdAndUpdate(bootcampId, {
      averageRating: obj[0].averageRating,
    });
  } catch (error) {
    console.error(err);
  }
  console.log(obj);
};
//Call getAverageRating after save
ReviewSchema.post('save', function () {
  this.constructor.getAverageRating(this.bootcamp);
});
//Call getAverageRating after remove
ReviewSchema.pre('deleteOne', { document: true, query: false }, function () {
  this.constructor.getAverageRating(this.bootcamp);
});

module.exports = mongoose.model('Review', ReviewSchema);

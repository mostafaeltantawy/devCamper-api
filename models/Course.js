const { default: mongoose } = require('mongoose');
const momgoose = require('mongoose');
const CourseSchema = new momgoose.Schema({
  title: {
    type: String,
    trim: true,
    required: [true, 'please add a course title'],
  },
  description: {
    type: String,
    required: [true, 'Please  add a description '],
  },
  weeks: {
    type: String,
    required: [true, 'Please  add a weeks '],
  },
  tuition: {
    type: Number,
    required: [true, 'Please  add a tuition cost  '],
  },
  minimumSkill: {
    type: String,
    required: [true, 'Please  add a minimumSkill '],
    enum: ['beginner', 'intermediate', 'advanced'],
  },
  scholarshipAvailable: {
    type: Boolean,
    default: false,
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
//Static method to get average of cost tuitions
CourseSchema.statics.getAverageCost = async function (bootcampId) {
  const obj = await this.aggregate([
    {
      $match: { bootcamp: bootcampId },
    },
    {
      $group: {
        _id: '$bootcamp',
        averageCost: { $avg: '$tuition' },
      },
    },
  ]);
  try {
    await this.model('Bootcamp').findByIdAndUpdate(bootcampId, {
      averageCost: obj[0].averageCost,
    });
  } catch (error) {
    console.error(err);
  }
};
//Call getAverageCost after save
CourseSchema.post('save', function () {
  this.constructor.getAverageCost(this.bootcamp);
});
//Call getAverageCost after remove
CourseSchema.pre('deleteOne', { document: true, query: false }, function () {
  this.constructor.getAverageCost(this.bootcamp);
});

module.exports = mongoose.model('Course', CourseSchema);

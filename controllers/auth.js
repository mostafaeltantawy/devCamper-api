const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const Bootcamp = require('../models/Bootcamp');
const User = require('../models/User');
const crypto = require('crypto');
const path = require('path');
const { send } = require('process');

// @desc      Register User
// @route     POST /api/v1/auth/register
// @access    Public
exports.register = async (req, res, next) => {
  const { name, email, password, role } = req.body;

  //Create User
  const user = await User.create({
    name,
    email,
    password,
    role,
  });

  sendTokenResponse(user, 200, res);
};

// @desc      Login User
// @route     POST /api/v1/auth/login
// @access    Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email or password', 400));
  }

  //Check for a user
  const user = await User.findOne({ email }).select('+password');
  console.log(user);
  if (!user) {
    return next(new ErrorResponse('Wrong email or password', 401));
  }

  //Check if password matches
  const isMatch = await user.matchPassword(password);
  console.log(isMatch);
  if (!isMatch) {
    return next(new ErrorResponse('Wrong email or password', 401));
  }

  sendTokenResponse(user, 200, res);
};

// @desc      Get current logged in user
// @route     GET /api/v1/auth/me
// @access    Private

exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: user,
  });
};

// @desc      Log user out / clear cookie
// @route     GET /api/v1/auth/logut
// @access    Private

exports.logOut = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    data: {},
  });
};

// @desc      Update user details
// @route     PUT /api/v1/auth/updatedetails
// @access    Private

exports.updateDetails = async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
  };
  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    success: true,
    data: user,
  });
};
// @desc      update password
// @route     PUT /api/v1/auth/updatepassword
// @access    Private

exports.updatePassword = async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  //check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }
  user.password = req.body.newPassword;
  await user.save();
  sendTokenResponse(user, 200, res);
};

// @desc      Forgot password
// @route     POST /api/v1/auth/forgotPassword
// @access    Public

exports.forgotPassword = async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
  });
  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }
  //Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });
  //create reset url
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/auth/resetPassword/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'password reset token',
      message,
    });
    res.status(200).json({
      success: true,
      data: 'Email sent',
    });
  } catch (error) {
    console.log(error);
    user.resetPasswordExpire = undefined;
    user.resetPasswordToken = undefined;
    await user.save({
      validateBeforeSave: false,
    });
    return next(new ErrorResponse('Email could not be sent', 500));
  }
  console.log(resetToken);
};

// Get token from model , create a  cookie and send response

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
  });
};

// @desc      Reset password
// @route     PUT /api/v1/auth/resetpassword/:passwordtoken
// @access    public

exports.resetPassword = async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid Token', 400));
  }
  //set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  sendTokenResponse(user, 200, res);
};

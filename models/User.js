  const mongoose =
  require("mongoose");

const userSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true
      },

      businessName: {
        type: String,
        required: true,
        trim: true
      },

      phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
      },

      password: {
        type: String,
        required: true
      },

      businessCategory: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "BusinessCategory",
        required: true
      },

      mkoa: {
        type: String,
        default: ""
      },

      wilaya: {
        type: String,
        default: ""
      },

      mtaa: {
        type: String,
        default: ""
      },

      isActive: {
        type: Boolean,
        default: true
      },

      role: {
        type: String,
        enum: [
          "owner",
          "staff"
        ],
        default: "owner"
      },

      owner: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
      },

      // STAFF ASSIGNED BRANCH
      branch: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        default: null,
        index: true
      }
    },
    {
      timestamps: true
    }
  );


// VALIDATION
userSchema.pre(
  "save",
  async function () {
    if (this.isNew) {
      // STAFF MUST HAVE OWNER
      if (
        this.role === "staff" &&
        !this.owner
      ) {
        throw new Error(
          "Staff must have owner"
        );
      }

      // OWNER CANNOT HAVE OWNER
      if (
        this.role === "owner" &&
        this.owner
      ) {
        throw new Error(
          "Owner cannot have owner"
        );
      }

      // STAFF MUST HAVE BRANCH
      if (
        this.role === "staff" &&
        !this.branch
      ) {
        throw new Error(
          "Staff must have branch"
        );
      }
    }
  }
);

module.exports =
  mongoose.model(
    "User",
    userSchema
  );

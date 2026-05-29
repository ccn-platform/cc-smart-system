  const mongoose =
  require("mongoose");

const customerIdentitySchema =
  new mongoose.Schema(
    {
      owner: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
      },

       phone: {
  type: String,
  trim: true
},

      nationalId: {
        type: String,
        default: "",
        trim: true,
        index: true
      },

      gender: {
        type: String,
        enum: [
          "",
          "male",
          "female"
        ],
        default: ""
      },

      dateOfBirth: {
        type: Date
      },

      region: {
        type: String,
        default: "",
        trim: true
      },

      district: {
        type: String,
        default: "",
        trim: true
      },

      ward: {
        type: String,
        default: "",
        trim: true
      },

      address: {
        type: String,
        default: ""
      },

      photo: {
        type: String,
        default: ""
      },

      faceId: {
        type: String,
        default: ""
      },

       fingerprintId: {
  type: String,
  trim: true
},

      mergeParent: {
  type:
    mongoose.Schema.Types.ObjectId,
  ref: "CustomerIdentity",
  default: null
},
      status: {
        type: String,
        enum: [
          "active",
          "blocked",
          "blacklisted"
        ],
        default:
          "active"
      },

      riskScore: {
        type: Number,
        default: 500,
        min: 0,
        max: 1000
      },

      totalLoans: {
        type: Number,
        default: 0
      },

      activeLoans: {
        type: Number,
        default: 0
      },

      overdueLoans: {
        type: Number,
        default: 0
      },

      paidLoans: {
        type: Number,
        default: 0
      },

      defaultedLoans: {
        type: Number,
        default: 0
      },

      totalBorrowed: {
        type: Number,
        default: 0
      },

      totalPaid: {
        type: Number,
        default: 0
      },

      notes: {
        type: String,
        default: ""
      },
      normalizedPhone: {
  type: String,
  default: "",
  index: true
},

normalizedName: {
  type: String,
  default: "",
  index: true
},
syncId: {
  type: String,
  default: null,
  index: true
},

syncStatus: {
  type: String,
  enum: [
    "synced",
    "pending",
    "conflict"
  ],
  default: "synced",
  index: true
},

source: {
  type: String,
  enum: [
    "online",
    "offline"
  ],
  default: "online"
},

deviceId: {
  type: String,
  default: null
},

lastSyncedAt: {
  type: Date,
  default: null
},
queuedAt: {
  type: Date,
  default: null
},

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    },
    {
      timestamps: true
    }
  );


// BUSINESS-SCOPED UNIQUE
 customerIdentitySchema.index(
  {
    owner: 1,
    phone: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      phone: {
        $type: "string",
        $ne: ""
      }
    }
  }
);

customerIdentitySchema.index({
  owner: 1,
  normalizedPhone: 1
});

customerIdentitySchema.index({
  owner: 1,
  normalizedName: 1
});
customerIdentitySchema.index({
  owner: 1,
  syncStatus: 1
});

 customerIdentitySchema.index(
  {
    owner: 1,
    syncId: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      syncId: {
        $type: "string"
      }
    }
  }
);
 customerIdentitySchema.index(
  {
    owner: 1,
    nationalId: 1
  },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      nationalId: {
        $type: "string",
        $ne: ""
      }
    }
  }
);
 customerIdentitySchema.index(
  {
    owner: 1,
    fingerprintId: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      fingerprintId: {
        $type: "string",
        $ne: ""
      }
    }
  }
);

customerIdentitySchema.index({
  owner: 1,
  status: 1
});

customerIdentitySchema.index({
  owner: 1,
  riskScore: -1
});

customerIdentitySchema.index({
  owner: 1,
  createdAt: -1
});
customerIdentitySchema.pre(
  "save",
  function (next) {

    // NORMALIZE PHONE
     if (this.phone) {

  let phone =
    this.phone
      .replace(/[^\d]/g, "");
  if (
    phone.startsWith("0")
  ) {
    phone =
      "255" +
      phone.substring(1);
  }

  if (
    phone.startsWith("+")
  ) {
    phone =
      phone.substring(1);
  }

  this.normalizedPhone =
    phone;

} else {

  this.normalizedPhone = "";
}

    // NORMALIZE NAME
if (this.fullName) {

  this.normalizedName =
    this.fullName
      .trim()
      .toLowerCase();

} else {

  this.normalizedName = "";
}

next();
   
  }
);
module.exports =
  mongoose.model(
    "CustomerIdentity",
    customerIdentitySchema
  );

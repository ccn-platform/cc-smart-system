 const mongoose =
  require("mongoose");


// ====================================
// DELETED DEBT LOAN
// PERMANENT DELETION TOMBSTONE
// ====================================

const deletedDebtLoanSchema =
  new mongoose.Schema(

    {

      owner: {

        type:
          mongoose.Schema.Types.ObjectId,

        required:
          true,

        index:
          true

      },


      branch: {

        type:
          mongoose.Schema.Types.ObjectId,

        required:
          true,

        index:
          true

      },


      loanId: {

        type:
          mongoose.Schema.Types.ObjectId,

        required:
          true

      },


      syncId: {

        type:
          String,

        required:
          true,

        trim:
          true

      },


      deleteSyncId: {

        type:
          String,

        default:
          "",

        trim:
          true

      },


      customer: {

        type:
          mongoose.Schema.Types.ObjectId,

        default:
          null

      },


      loanNumber: {

        type:
          String,

        default:
          "",

        trim:
          true

      },


      deviceId: {

        type:
          String,

        default:
          "",

        trim:
          true

      },


      deletedBy: {

        type:
          mongoose.Schema.Types.ObjectId,

        default:
          null

      },


      status: {

        type:
          String,

        enum: [
          "deleted"
        ],

        default:
          "deleted"

      },


      deletedAt: {

        type:
          Date,

        default:
          Date.now

      }

    },

    {

      timestamps:
        true,

      collection:
        "deleted_debt_loans"

    }

  );


// ====================================
// SAME syncId CANNOT BE REUSED
// ====================================

deletedDebtLoanSchema.index(

  {
    owner: 1,
    branch: 1,
    syncId: 1
  },

  {
    unique:
      true
  }

);


module.exports =
  mongoose.models.DeletedDebtLoan ||
  mongoose.model(
    "DeletedDebtLoan",
    deletedDebtLoanSchema
  );

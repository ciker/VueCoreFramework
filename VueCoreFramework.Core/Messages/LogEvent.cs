﻿namespace VueCoreFramework.Core.Messages
{
    /// <summary>
    /// A collection of log event codes.
    /// </summary>
    public static class LogEvent
    {
#pragma warning disable CS1591
        // User events
        public const int LOGIN = 1000;
        public const int LOGIN_EXTERNAL = 1001;
        public const int EXTERNAL_PROVIDER_NOTFOUND = 1002;
        public const int LOGOUT = 1010;
        public const int NEW_ACCOUNT = 1020;
        public const int NEW_ACCOUNT_EXTERNAL = 1021;
        public const int ADD_EXTERNAL_LOGIN = 1030;
        public const int REMOVE_EXTERNAL_LOGIN = 1031;
        public const int EMAIL_CONFIRM = 1040;
        public const int EMAIL_CHANGE_REQUEST = 1041;
        public const int EMAIL_CHANGE_CONFIRM = 1042;
        public const int EMAIL_CHANGE_CANCEL = 1043;
        public const int EMAIL_CHANGE_REVERT = 1044;
        public const int SET_PW = 1050;
        public const int CHANGE_PW = 1051;
        public const int RESET_PW_REQUEST = 1052;
        public const int RESET_PW_CONFIRM = 1053;
        public const int USERNAME_CHANGE = 1060;
        public const int DELETE_ACCOUNT = 1070;
        public const int LOCK_ACCOUNT = 1080;
        public const int UNLOCK_ACCOUNT = 1081;

        // Repository events
        public const int CLASS_NOTFOUND = 2000;
        public const int GET_ITEM_NOTFOUND = 2010;
        public const int GET_ITEM_FAIL = 2011;
        public const int ADD_ITEM_FAIL = 2021;
        public const int UPDATE_ITEM_NOTFOUND = 2030;
        public const int UPDATE_ITEM_FAIL = 2031;
        public const int DELETE_ITEM_NOTFOUND = 2040;
        public const int DELETE_ITEM_FAIL = 2041;

        // Internal errors
        public const int INTERNAL_ERROR = 9000;
        public const int SEND_EMAIL_ERROR = 9010;
#pragma warning restore CS1591
    }
}

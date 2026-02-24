/**
 * 柚子工具网 (UZTOOL.COM) - 房贷计算器核心逻辑引擎
 * 针对 GitHub Pages 托管环境优化：解决脚本加载时序导致的点击失效
 */
(function() {
    var checkDependency = function(callback) {
        if (window.jQuery) {
            callback(jQuery);
        } else {
            window.setTimeout(function() { checkDependency(callback); }, 50);
        }
    };

    checkDependency(function($) {
        console.log("UZTOOL: 房贷深度测算引擎已就绪...");

        // --- 全局参数初始化 ---
        var businessShortRateArr6 = [5.1, 5.35, 5.6, 5.85, 6.1, 5.85, 5.6, 5.6, 5.35, 5.1, 4.85, 4.6, 3.45],
            businessShortRateArr12 = [5.56, 5.81, 6.06, 6.31, 6.56, 6.31, 6, 5.6, 5.35, 5.1, 4.85, 4.6, 3.45],
            businessShortRateArr36 = [5.6, 5.85, 6.1, 6.4, 6.65, 6.4, 6.15, 6, 5.75, 5.5, 5.25, 5, 3.45],
            businessShortRateArr60 = [5.96, 6.22, 6.45, 6.65, 6.9, 6.65, 6.4, 6, 5.75, 5.5, 5.25, 5, 4.2],
            businessLongRateArr = [6.14, 6.4, 6.6, 6.8, 7.05, 6.8, 6.55, 6.15, 5.9, 5.65, 5.4, 5.15, 4.2],
            PAFShortRateArr = [3.5, 3.75, 4, 4.2, 4.45, 4.2, 4, 3.75, 3.5, 3.25, 3, 2.75, 2.75],
            PAFLongRateArr = [4.05, 4.3, 4.5, 4.7, 4.45, 4.7, 4.5, 4.25, 4, 3.75, 3.5, 3.25, 3.25],
            loanType = 0,
            loanPeriods = 240,
            businessPeriodType = 4,
            PAFPeriodType = 1,
            businessRateType = 12,
            PAFRateType = 12,
            businessDiscount = 1,
            showResultTabID = 1,
            simpleDataTableMaxLines = 10,
            BLinkStatus = 0;

        // --- 交互逻辑绑定 (修正多重嵌套) ---
        
        // 商业贷款切换
        $("#business_calc").on("click", function() {
            if ($(this).hasClass("normal-tab")) {
                $(this).removeClass("normal-tab").addClass("select-tab").siblings(".tab").removeClass("select-tab").addClass("normal-tab");
                $("#business_sum_line, #business_rate_select_line, #business_rate_value_line, #business_atc_recmd_mod").show();
                $("#PAF_sum_line, #PAF_rate_line, [id*='interest_total_debx'], [id*='interest_total_debj'], #PAF_atc_recmd_mod").hide();
                loanType = 0;
            }
        });

        // 公积金切换
        $("#PAF_calc").on("click", function() {
            if ($(this).hasClass("normal-tab")) {
                $(this).removeClass("normal-tab").addClass("select-tab").siblings(".tab").removeClass("select-tab").addClass("normal-tab");
                $("#PAF_sum_line, #PAF_rate_line, #PAF_atc_recmd_mod").show();
                $("#business_sum_line, #business_rate_select_line, #business_rate_value_line, [id*='interest_total_debx'], [id*='interest_total_debj'], #business_atc_recmd_mod").hide();
                loanType = 1;
            }
        });

        // 组合贷款切换
        $("#mix_calc").on("click", function() {
            if ($(this).hasClass("normal-tab")) {
                $(this).removeClass("normal-tab").addClass("select-tab").siblings(".tab").removeClass("select-tab").addClass("normal-tab");
                $("#business_sum_line, #business_rate_select_line, #business_rate_value_line, #PAF_sum_line, #PAF_rate_line, [id*='interest_total_debx'], [id*='interest_total_debj'], #business_atc_recmd_mod").show();
                $("#PAF_atc_recmd_mod").hide();
                loanType = 2;
            }
        });

        // 结果选项卡
        $(".result-tab").on("click", function() {
            if ($(this).hasClass("normal-tab")) {
                $(this).removeClass("normal-tab").addClass("select-tab").siblings(".result-tab").removeClass("select-tab").addClass("normal-tab");
                var tid = $(this).attr("tab-id");
                $("#result_data_" + tid).show().siblings(".result-data").hide();
                showResultTabID = parseInt(tid);
            }
        });

        // 贷款期限选择
        $("#loan_period_select").on("change", function() {
            var val = parseInt($(this).val());
            if (val == 0) { loanPeriods = 6; PAFPeriodType = businessPeriodType = 0; }
            else if (val == 1) { loanPeriods = 12; businessPeriodType = 1; PAFPeriodType = 0; }
            else if (val <= 3) { loanPeriods = 12 * val; businessPeriodType = 2; PAFPeriodType = 0; }
            else if (val <= 5) { loanPeriods = 12 * val; businessPeriodType = 3; PAFPeriodType = 0; }
            else { loanPeriods = 12 * val; businessPeriodType = 4; PAFPeriodType = 1; }
            
            $("#loan_period_select_bar").text($(this).find("option:selected").text()).val($(this).val());
            if ($("#business_rate_select").attr("input-method") == "auto") businessRateUpdate();
            if ($("#PAF_rate_select").attr("input-method") == "auto") PAFRateUpdate();
        });

        // 利率选择逻辑
        $("#business_rate_select").on("change", function() {
            businessRateType = $(this).val();
            $("#business_rate_select_bar").text($(this).find("option:selected").text()).val(businessRateType);
            if (businessRateType == -1) {
                $("#business_discount_field").hide();
                $("#business_rate_select_field").removeClass("long-field");
                $("#business_rate").val("");
                $(this).attr("input-method", "hand");
            } else {
                $("#business_rate_select_field").addClass("long-field");
                $("#business_discount_field").show();
                $(this).attr("input-method", "auto");
                businessRateUpdate();
            }
        });

        $("#business_discount").on("change", function() {
            businessDiscount = parseFloat($(this).find("option:selected").attr("data-discount"));
            $("#business_discount_bar").text($(this).find("option:selected").text()).attr("data-discount", businessDiscount);
            businessRateUpdate();
        });

        $("#PAF_rate_select").on("change", function() {
            PAFRateType = $(this).val();
            $("#PAF_rate_select_bar").text($(this).find("option:selected").text()).val(PAFRateType);
            if (PAFRateType == -1) {
                $("#PAF_rate").val("");
                $(this).attr("input-method", "hand");
            } else {
                $(this).attr("input-method", "auto");
                PAFRateUpdate();
            }
        });

        // 计算逻辑启动
        $("#calculate").on("click", function() {
            if (userInputCheck()) {
                calculate();
                window.scrollTo(0, 0);
                $("[view=calc_input]").hide();
                $("[view=calc_result]").show();
            }
        });

        $("#recalculate").on("click", function() {
            window.scrollTo(0, 0);
            $("[view=calc_result]").hide();
            $("[view=calc_input]").show();
        });

        $(".view-more").on("click", function() {
            var detailId = $(this).attr("data-detail");
            $("#data_detail_" + detailId).show().siblings(".data-container").hide();
            window.scrollTo(0, 0);
            $("[view=calc_result]").hide();
            $("[view=data_detail]").show();
            $("#data_detail_bar").show();
        });

        $("#back_to_calc_input").on("click", function() {
            window.scrollTo(0, 0);
            $("[view=calc_result]").hide();
            $("[view=calc_input]").show();
        });

        $("#back_to_calc_result").on("click", function() {
            window.scrollTo(0, 0);
            $("#data_detail_bar").hide();
            $("[view=data_detail]").hide();
            $("[view=calc_result]").show();
        });

        // 内部工具函数
        function businessRateUpdate() {
            var rate = 0;
            if (businessPeriodType == 0) rate = businessShortRateArr6[businessRateType];
            else if (businessPeriodType == 1) rate = businessShortRateArr12[businessRateType];
            else if (businessPeriodType == 2) rate = businessShortRateArr36[businessRateType];
            else if (businessPeriodType == 3) rate = businessShortRateArr60[businessRateType];
            else if (businessPeriodType == 4) rate = businessLongRateArr[businessRateType];
            rate = Math.round(rate * businessDiscount * 100) / 100;
            $("#business_rate").val(rate);
        }

        function PAFRateUpdate() {
            var rate = (PAFPeriodType == 0) ? PAFShortRateArr[PAFRateType] : PAFLongRateArr[PAFRateType];
            $("#PAF_rate").val(rate);
        }

        function userInputCheck() {
            if (loanType == 0) return businessSumInputCheck() && businessRateInputCheck();
            if (loanType == 1) return PAFSumInputCheck() && PAFRateInputCheck();
            if (loanType == 2) return businessSumInputCheck() && businessRateInputCheck() && PAFSumInputCheck() && PAFRateInputCheck();
            return false;
        }

        function businessSumInputCheck() {
            var val = $.trim($("#business_sum").val());
            if (val != "" && /^\d*[\.]?\d*$/.test(val)) return true;
            $("#business_sum").val("").focus();
            return false;
        }

        function businessRateInputCheck() {
            var val = $.trim($("#business_rate").val());
            if (val != "" && /^\d*[\.]?\d*$/.test(val)) return true;
            $("#business_rate").val("").focus();
            return false;
        }

        function PAFSumInputCheck() {
            var val = $.trim($("#PAF_sum").val());
            if (val != "" && /^\d*[\.]?\d*$/.test(val)) return true;
            $("#PAF_sum").val("").focus();
            return false;
        }

        function PAFRateInputCheck() {
            var val = $.trim($("#PAF_rate").val());
            if (val != "" && /^\d*[\.]?\d*$/.test(val)) return true;
            $("#PAF_rate").val("").focus();
            return false;
        }

        function calculate() {
            calculate_debx();
            calculate_debj();
            var type = $('input[name="repayType"]:checked').val();
            $("#result_tab_" + type).removeClass("normal-tab").addClass("select-tab").siblings(".result-tab").removeClass("select-tab").addClass("normal-tab");
            $("#result_data_" + type).show().siblings(".result-data").hide();
            showResultTabID = type;
        }

        function calculate_debx() {
            var res = 0;
            if (loanType == 0) {
                res = calculate_debx_singleLoan(1E4 * parseFloat($("#business_sum").val()), parseFloat($("#business_rate").val()) / 1200);
            } else if (loanType == 1) {
                res = calculate_debx_singleLoan(1E4 * parseFloat($("#PAF_sum").val()), parseFloat($("#PAF_rate").val()) / 1200);
            } else if (loanType == 2) {
                res = calculate_debx_doubleLoan(1E4 * parseFloat($("#business_sum").val()), parseFloat($("#business_rate").val()) / 1200, 1E4 * parseFloat($("#PAF_sum").val()), parseFloat($("#PAF_rate").val()) / 1200);
            }
            return res;
        }

        function calculate_debx_singleLoan(total, monthlyRate) {
            var interest = total * loanPeriods * monthlyRate * Math.pow(1 + monthlyRate, loanPeriods) / (Math.pow(1 + monthlyRate, loanPeriods) - 1) - total;
            interest = Math.round(interest * 100) / 100;
            var totalRepay = Math.round((interest + total) * 100) / 100;
            $("#interest_total_1").text(interest + "元");
            $("#repay_total_1").text(totalRepay + "元");
            var monthlyRepay = Math.round((totalRepay / loanPeriods) * 100) / 100;
            var html = "", firstInterest = 0, simpleHtml = "";
            for (var i = 1; i <= loanPeriods; i++) {
                var curInterest = Math.round(total * monthlyRate * (Math.pow(1 + monthlyRate, loanPeriods) - Math.pow(1 + monthlyRate, i - 1)) / (Math.pow(1 + monthlyRate, loanPeriods) - 1) * 100) / 100;
                var curPrincipal = Math.round((monthlyRepay - curInterest) * 100) / 100;
                var remain = Math.round(total * (Math.pow(1 + monthlyRate, loanPeriods) - Math.pow(1 + monthlyRate, i)) / (Math.pow(1 + monthlyRate, loanPeriods) - 1) * 100) / 100;
                html += "<tr><td>"+i+"</td><td>"+monthlyRepay+"</td><td>"+curInterest+"</td><td>"+curPrincipal+"</td><td>"+remain+"</td></tr>";
                if (i == 1) firstInterest = curInterest;
                if (i == simpleDataTableMaxLines) simpleHtml = html;
            }
            $("#standard_data_table_1").html(html);
            $("#simple_data_table_1").html(simpleHtml || html);
            $("#repay_monthly_1").text(monthlyRepay + "元");
            $("#interest_monthly_1").text(firstInterest + "元");
            return interest;
        }

        function calculate_debx_doubleLoan(aSum, aRate, bSum, bRate) {
            var aInt = Math.round((aSum * loanPeriods * aRate * Math.pow(1 + aRate, loanPeriods) / (Math.pow(1 + aRate, loanPeriods) - 1) - aSum) * 100) / 100;
            var bInt = Math.round((bSum * loanPeriods * bRate * Math.pow(1 + bRate, loanPeriods) / (Math.pow(1 + bRate, loanPeriods) - 1) - bSum) * 100) / 100;
            var totalInt = Math.round((aInt + bInt) * 100) / 100;
            var totalRepay = Math.round((totalInt + aSum + bSum) * 100) / 100;
            $("#business_interest_total_1").text(aInt + "元");
            $("#PAF_interest_total_1").text(bInt + "元");
            $("#interest_total_1").text(totalInt + "元");
            $("#repay_total_1").text(totalRepay + "元");
            var monthlyRepay = Math.round((totalRepay / loanPeriods) * 100) / 100;
            var html = "", firstInt = 0, simpleHtml = "";
            for (var i = 1; i <= loanPeriods; i++) {
                var curAInt = aSum * aRate * (Math.pow(1 + aRate, loanPeriods) - Math.pow(1 + aRate, i - 1)) / (Math.pow(1 + aRate, loanPeriods) - 1);
                var curBInt = bSum * bRate * (Math.pow(1 + bRate, loanPeriods) - Math.pow(1 + bRate, i - 1)) / (Math.pow(1 + bRate, loanPeriods) - 1);
                var curTotalInt = Math.round((curAInt + curBInt) * 100) / 100;
                var curPrincipal = Math.round((monthlyRepay - curTotalInt) * 100) / 100;
                var remainA = aSum * (Math.pow(1 + aRate, loanPeriods) - Math.pow(1 + aRate, i)) / (Math.pow(1 + aRate, loanPeriods) - 1);
                var remainB = bSum * (Math.pow(1 + bRate, loanPeriods) - Math.pow(1 + bRate, i)) / (Math.pow(1 + bRate, loanPeriods) - 1);
                var remainTotal = Math.round((remainA + remainB) * 100) / 100;
                html += "<tr><td>"+i+"</td><td>"+monthlyRepay+"</td><td>"+curTotalInt+"</td><td>"+curPrincipal+"</td><td>"+remainTotal+"</td></tr>";
                if (i == 1) firstInt = curTotalInt;
                if (i == simpleDataTableMaxLines) simpleHtml = html;
            }
            $("#standard_data_table_1").html(html);
            $("#simple_data_table_1").html(simpleHtml || html);
            $("#repay_monthly_1").text(monthlyRepay + "元");
            $("#interest_monthly_1").text(firstInt + "元");
            return totalInt;
        }

        function calculate_debj() {
            if (loanType == 0) return calculate_debj_singleLoan(1E4 * parseFloat($("#business_sum").val()), parseFloat($("#business_rate").val()) / 1200);
            if (loanType == 1) return calculate_debj_singleLoan(1E4 * parseFloat($("#PAF_sum").val()), parseFloat($("#PAF_rate").val()) / 1200);
            if (loanType == 2) return calculate_debj_doubleLoan(1E4 * parseFloat($("#business_sum").val()), parseFloat($("#business_rate").val()) / 1200, 1E4 * parseFloat($("#PAF_sum").val()), parseFloat($("#PAF_rate").val()) / 1200);
        }

        function calculate_debj_singleLoan(total, monthlyRate) {
            var interest = Math.round((total * monthlyRate * (loanPeriods + 1) / 2) * 100) / 100;
            var totalRepay = Math.round((interest + total) * 100) / 100;
            $("#interest_total_2").text(interest + "元");
            $("#repay_total_2").text(totalRepay + "元");
            var basePrincipal = Math.round((total / loanPeriods) * 100) / 100;
            var html = "", firstM = 0, firstI = 0, simpleHtml = "";
            for (var i = 1; i <= loanPeriods; i++) {
                var curInt = Math.round((total * monthlyRate * (loanPeriods - i + 1) / loanPeriods) * 100) / 100;
                var curRepay = Math.round((curInt + basePrincipal) * 100) / 100;
                var remain = Math.round((total * (loanPeriods - i) / loanPeriods) * 100) / 100;
                html += "<tr><td>"+i+"</td><td>"+curRepay+"</td><td>"+curInt+"</td><td>"+basePrincipal+"</td><td>"+remain+"</td></tr>";
                if (i == 1) { firstM = curRepay; firstI = curInt; }
                if (i == simpleDataTableMaxLines) simpleHtml = html;
            }
            $("#standard_data_table_2").html(html);
            $("#simple_data_table_2").html(simpleHtml || html);
            $("#repay_monthly_2").text(firstM + "元");
            $("#interest_monthly_2").text(firstI + "元");
            return interest;
        }

        function calculate_debj_doubleLoan(aSum, aRate, bSum, bRate) {
            var aInt = Math.round((aSum * aRate * (loanPeriods + 1) / 2) * 100) / 100;
            var bInt = Math.round((bSum * bRate * (loanPeriods + 1) / 2) * 100) / 100;
            var totalInt = Math.round((aInt + bInt) * 100) / 100;
            var totalRepay = Math.round((totalInt + aSum + bSum) * 100) / 100;
            $("#business_interest_total_2").text(aInt + "元");
            $("#PAF_interest_total_2").text(bInt + "元");
            $("#interest_total_2").text(totalInt + "元");
            $("#repay_total_2").text(totalRepay + "元");
            var basePrincipal = Math.round(((aSum + bSum) / loanPeriods) * 100) / 100;
            var html = "", firstM = 0, firstI = 0, simpleHtml = "";
            for (var i = 1; i <= loanPeriods; i++) {
                var curInt = Math.round((aSum * aRate * (loanPeriods - i + 1) / loanPeriods + bSum * bRate * (loanPeriods - i + 1) / loanPeriods) * 100) / 100;
                var curRepay = Math.round((curInt + basePrincipal) * 100) / 100;
                var remain = Math.round(((aSum + bSum) * (loanPeriods - i) / loanPeriods) * 100) / 100;
                html += "<tr><td>"+i+"</td><td>"+curRepay+"</td><td>"+curInt+"</td><td>"+basePrincipal+"</td><td>"+remain+"</td></tr>";
                if (i == 1) { firstM = curRepay; firstI = curInt; }
                if (i == simpleDataTableMaxLines) simpleHtml = html;
            }
            $("#standard_data_table_2").html(html);
            $("#simple_data_table_2").html(simpleHtml || html);
            $("#repay_monthly_2").text(firstM + "元");
            $("#interest_monthly_2").text(firstI + "元");
            return totalInt;
        }
    });
})();

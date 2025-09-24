using System.ComponentModel.DataAnnotations;

namespace rescueApp.Models.Requests
{
    public class UpdateFosterApplicationRequest
    {
        [Required(AllowEmptyStrings = false)]
        [MaxLength(50)]
        public string? NewStatus { get; set; } // e.g., "Approved", "Rejected", "On Hold"

        public string? InternalNotes { get; set; } // Optional admin notes
    }
}
